import sql from "mssql";
import { query, transaction } from "../db/sqlServer";
import { BadRequestError, ForbiddenError } from "../utils/httpError";

import { HttpError } from "../utils/httpError";
/**
 * ===== Helpers =====
 */
function normalizeStatus(value?: string) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || normalized === "all") return null;
  return normalized;
}

function buildInClause(values: number[], paramPrefix: string) {
  const params: Record<string, unknown> = {};
  const placeholders = values.map((value, index) => {
    const key = `${paramPrefix}${index}`;
    params[key] = value;
    return `@${key}`;
  });
  return { placeholders: placeholders.join(", "), params };
}

/**
 * ===== Player Service (internal helper) =====
 * get-or-create player by (full_name + date_of_birth)
 */
async function getOrCreatePlayerByNameDob(
  tx: sql.Transaction,
  input: {
    fullName: string;
    dateOfBirth: Date;
    nationality?: string | null;
    preferredPosition?: string | null;
    createdBy?: number | null;
  }
): Promise<number> {
  const findReq = new sql.Request(tx);
  findReq.input("full_name", sql.NVarChar, input.fullName);
  findReq.input("dob", sql.Date, input.dateOfBirth);

  // Check players table
  const existing = await findReq.query(`
    SELECT TOP 1 player_id
    FROM players
    WHERE LOWER(LTRIM(RTRIM(full_name))) = LOWER(@full_name)
      AND CONVERT(date, date_of_birth) = CONVERT(date, @dob)
  `);

  if (existing.recordset[0]) {
    return Number(existing.recordset[0].player_id);
  }

  const createReq = new sql.Request(tx);
  createReq.input("full_name", sql.NVarChar, input.fullName);
  createReq.input("date_of_birth", sql.Date, input.dateOfBirth);
  createReq.input("nationality", sql.NVarChar, input.nationality ?? null);
  createReq.input("preferred_position", sql.NVarChar, input.preferredPosition ?? null);
  createReq.input("created_by", sql.Int, input.createdBy ?? null);

  const res = await createReq.query(`
      INSERT INTO players (
        full_name,
        display_name,
        date_of_birth,
        nationality,
        preferred_position,
        created_by,
        created_at
      )
      OUTPUT INSERTED.player_id
      VALUES (
        @full_name,
        @full_name,
        @date_of_birth,
        @nationality,
        @preferred_position,
        @created_by,
        SYSUTCDATETIME()
      )
    `);
  return Number(res.recordset[0].player_id);
}

/**
 * ===== LIST REGISTRATIONS =====
 */
export async function listPlayerRegistrations(
  filters: {
    seasonId?: number;
    teamId?: number;
    status?: string;
  },
  scopedTeamIds?: number[] | null
) {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.seasonId) {
    conditions.push("spr.season_id = @seasonId");
    params.seasonId = filters.seasonId;
  }

  if (filters.teamId) {
    conditions.push("stp.team_id = @teamId");
    params.teamId = filters.teamId;
  }

  const status = normalizeStatus(filters.status);
  if (status) {
    conditions.push("spr.registration_status = @status");
    params.status = status;
  }

  if (Array.isArray(scopedTeamIds)) {
    if (scopedTeamIds.length === 0) return [];
    const { placeholders, params: inParams } = buildInClause(scopedTeamIds, "scopedTeamId");
    conditions.push(`stp.team_id IN (${placeholders})`);
    Object.assign(params, inParams);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `
      SELECT
        spr.season_player_id AS id,
        spr.season_id,
        spr.player_id,
        spr.season_team_id,
        spr.registration_status,
        spr.registered_at,
        spr.approved_at,
        spr.approved_by,
        spr.file_path,
        spr.reject_reason,
        spr.position_code,
        spr.shirt_number,
        spr.player_type,
        p.full_name AS player_name,
        p.date_of_birth,
        p.nationality,
        t.team_id,
        t.name AS team_name,
        NULL AS logo_url,
        s.name AS season_name
      FROM season_player_registrations spr
      JOIN players p ON spr.player_id = p.player_id
      JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
      JOIN teams t ON stp.team_id = t.team_id
      JOIN seasons s ON spr.season_id = s.season_id
      ${whereClause}
      ORDER BY spr.registered_at DESC
    `,
    params
  );

  return result.recordset;
}

/**
 * ===== UPDATE REGISTRATION =====
 * ❌ Không cho phép sửa PLAYER nền
 */
export async function updatePlayerRegistration(
  id: number,
  input: {
    positionCode?: string;
    shirtNumber?: number | null;
    playerType?: string;
    filePath?: string;
    actorId?: number;
    scopedTeamIds?: number[] | null;
  }
) {
  if (!id || Number.isNaN(Number(id))) {
    throw BadRequestError("Invalid registration id");
  }

  return transaction(async (tx) => {
    const checkReq = new sql.Request(tx);
    checkReq.input("id", sql.Int, id);

    const existingRes = await checkReq.query(`
      SELECT
        spr.registration_status,
        stp.team_id
      FROM season_player_registrations spr
      JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
      WHERE spr.season_player_id = @id
    `);

    const existing = existingRes.recordset[0];
    if (!existing) throw BadRequestError("Registration not found");
    if (String(existing.registration_status).toLowerCase() !== "pending") {
      throw BadRequestError("Registration is not pending");
    }

    if (
      Array.isArray(input.scopedTeamIds) &&
      !input.scopedTeamIds.includes(Number(existing.team_id))
    ) {
      throw ForbiddenError("You are not allowed to update registrations for this team");
    }

    const regReq = new sql.Request(tx);
    regReq.input("id", sql.Int, id);
    regReq.input(
      "position_code",
      sql.NVarChar(50),
      input.positionCode !== undefined ? String(input.positionCode).trim() : null
    );
    regReq.input("has_shirt_number", sql.Bit, input.shirtNumber !== undefined ? 1 : 0);
    regReq.input(
      "shirt_number",
      sql.Int,
      input.shirtNumber !== undefined ? input.shirtNumber : null
    );
    regReq.input(
      "player_type",
      sql.NVarChar(50),
      input.playerType !== undefined ? String(input.playerType).trim().toLowerCase() : null
    );
    regReq.input(
      "is_foreign",
      sql.Bit,
      input.playerType !== undefined
        ? String(input.playerType).trim().toLowerCase() === "foreign"
          ? 1
          : 0
        : null
    );
    regReq.input(
      "file_path",
      sql.NVarChar(255),
      input.filePath !== undefined ? input.filePath : null
    );

    await regReq.query(`
      UPDATE season_player_registrations
      SET
        position_code = COALESCE(@position_code, position_code),
        shirt_number = CASE WHEN @has_shirt_number = 1 THEN @shirt_number ELSE shirt_number END,
        player_type = COALESCE(@player_type, player_type),
        is_foreign = COALESCE(@is_foreign, is_foreign),
        file_path = COALESCE(@file_path, file_path)
      WHERE season_player_id = @id
    `);
  });
}

