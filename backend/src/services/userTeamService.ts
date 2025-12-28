import { query } from "../db/sqlServer";
import { logEvent } from "./auditService";
import { BadRequestError } from "../utils/httpError";

export async function getUserTeamIds(userId: number): Promise<number[]> {
  if (!userId || Number.isNaN(Number(userId))) {
    return [];
  }

  const result = await query<{ team_id: number }>(
    `
    SELECT DISTINCT team_id
    FROM user_team_assignments
    WHERE user_id = @userId
    `,
    { userId }
  );

  return result.recordset
    .map(r => Number(r.team_id))
    .filter(id => Number.isFinite(id) && id > 0);
}


export async function listUserTeams(userId: number) {
  const result = await query<{
    team_id: number;
    team_name: string;
    assigned_at: Date;
    assigned_by: number | null;
  }>(
    `
      SELECT
        uta.team_id,
        t.name AS team_name,
        uta.assigned_at,
        uta.assigned_by
      FROM user_team_assignments uta
      JOIN teams t ON uta.team_id = t.team_id
      WHERE uta.user_id = @userId
      ORDER BY t.name
    `,
    { userId }
  );

  return result.recordset;
}

export async function assignTeamToUser(
  userId: number,
  teamId: number,
  actorId: number
): Promise<void> {
  if (!userId || Number.isNaN(Number(userId))) {
    throw BadRequestError("Invalid user id");
  }
  if (!teamId || Number.isNaN(Number(teamId))) {
    throw BadRequestError("Invalid team id");
  }

  await query(
    `
      MERGE user_team_assignments AS target
      USING (SELECT @userId AS user_id, @teamId AS team_id) AS src
      ON target.user_id = src.user_id AND target.team_id = src.team_id
      WHEN NOT MATCHED THEN
        INSERT (user_id, team_id, assigned_at, assigned_by)
        VALUES (@userId, @teamId, SYSUTCDATETIME(), @actorId);
    `,
    { userId, teamId, actorId }
  );

  await logEvent({
    eventType: "USER_TEAM_ASSIGNED",
    severity: "info",
    actorId,
    entityType: "USER",
    entityId: String(userId),
    payload: { teamId },
  });
}

export async function removeTeamFromUser(
  userId: number,
  teamId: number,
  actorId: number
): Promise<void> {
  if (!userId || Number.isNaN(Number(userId))) {
    throw BadRequestError("Invalid user id");
  }
  if (!teamId || Number.isNaN(Number(teamId))) {
    throw BadRequestError("Invalid team id");
  }

  await query(
    `
      DELETE FROM user_team_assignments
      WHERE user_id = @userId AND team_id = @teamId
    `,
    { userId, teamId }
  );

  await logEvent({
    eventType: "USER_TEAM_REMOVED",
    severity: "info",
    actorId,
    entityType: "USER",
    entityId: String(userId),
    payload: { teamId },
  });
}
