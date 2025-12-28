
import { AuthenticatedRequest } from "../types";
import { BadRequestError, ForbiddenError } from "../utils/httpError";
import { getUserTeamIds } from "../services/userTeamService";
import {
  listPlayerRegistrations,
} from "../services/playerRegistrationService";
import {
  approveRegistration,
  rejectRegistration,
  updateRegistration
} from "../services/seasonPlayerRegistrationService";
import { query } from "../db/sqlServer";
import * as playerRegistrationService from "../services/playerRegistrationService";
import * as seasonPlayerRegistrationService from "../services/seasonPlayerRegistrationService";
import { NextFunction, Response } from "express";

function hasPermission(req: AuthenticatedRequest, permission: string) {
  const permissions = Array.isArray(req.user?.permissions) ? req.user?.permissions : [];
  return permissions.includes(permission);
}

function isGlobalRegistrationUser(req: AuthenticatedRequest) {
  return (
    Array.isArray(req.user?.roles) && req.user?.roles.includes("super_admin")
  ) ||
    hasPermission(req, "approve_player_registrations") ||
    hasPermission(req, "manage_teams");
}

async function resolveScopedTeamIds(req: AuthenticatedRequest) {
  if (isGlobalRegistrationUser(req)) {
    return null;
  }

  const teamIdsFromToken = Array.isArray(req.user?.teamIds) ? req.user?.teamIds : null;
  if (teamIdsFromToken) {
    return teamIdsFromToken;
  }

  const userId = req.user?.sub;
  if (!userId) {
    return [];
  }
  return getUserTeamIds(userId);
}

export async function list(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seasonIdRaw = String(req.query.seasonId ?? req.query.season_id ?? "").trim();
  const teamIdRaw = String(req.query.teamId ?? req.query.team_id ?? "").trim();
  const statusRaw = String(req.query.status ?? req.query.registration_status ?? "").trim();

  const seasonId = seasonIdRaw ? Number(seasonIdRaw) : undefined;
  const teamId = teamIdRaw ? Number(teamIdRaw) : undefined;

  if (seasonIdRaw && Number.isNaN(seasonId)) {
    throw BadRequestError("Invalid seasonId");
  }

  if (teamIdRaw && Number.isNaN(teamId)) {
    throw BadRequestError("Invalid teamId");
  }

  const scopedTeamIds = await resolveScopedTeamIds(req);
  if (Array.isArray(scopedTeamIds) && teamId && !scopedTeamIds.includes(teamId)) {
    throw ForbiddenError("You are not allowed to access this team");
  }

  const data = await listPlayerRegistrations(
    {
      seasonId,
      teamId,
      status: statusRaw || undefined,
    },
    scopedTeamIds
  );

  res.json(data);
}

export async function create(req: AuthenticatedRequest, res: Response): Promise<void> {
  throw BadRequestError("NEW_PLAYER_REGISTRATION_DISABLED_MAINTENANCE");
}

export async function update(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw BadRequestError("Invalid registration id");
  }

  const file = req.file;
  const positionCode = req.body.position_code ?? req.body.positionCode;
  const playerType = req.body.player_type ?? req.body.playerType;

  const shirtNumberRaw = req.body.shirt_number ?? req.body.shirtNumber;
  const shirtNumber =
    shirtNumberRaw === undefined
      ? undefined
      : shirtNumberRaw === ""
        ? null
        : Number(shirtNumberRaw);

  if (shirtNumber !== undefined && shirtNumber !== null && Number.isNaN(shirtNumber)) {
    throw BadRequestError("shirt_number must be a number");
  }

  await updateRegistration(id, {
    position_code: positionCode !== undefined ? String(positionCode) : undefined,
    shirt_number: shirtNumber,
    player_type: playerType !== undefined ? String(playerType) : undefined,
    file_path: file ? file.path : undefined,
    currentUser: {
      sub: req.user!.sub,
      username: req.user?.username,
      roles: req.user?.roles,
      teamIds: req.user?.teamIds
    }
  });

  res.json({ message: "Registration updated successfully" });
}

export async function approve(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw BadRequestError("Invalid registration id");
  }

  await approveRegistration(id, req.user?.sub);
  res.json({ message: "Approved successfully" });
}

export async function reject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw BadRequestError("Invalid registration id");
  }

  const reason = String(req.body.reason ?? req.body.rejectReason ?? "").trim();
  if (!reason) {
    throw BadRequestError("Reject reason is required");
  }

  await rejectRegistration(id, reason, req.user?.sub);
  res.json({ message: "Rejected successfully" });
}

export async function listSeasonTeams(req: AuthenticatedRequest, res: Response) {
  const seasonId = Number(req.query.seasonId ?? req.query.season_id);

  if (Number.isNaN(seasonId)) {
    throw BadRequestError("Invalid season_id");
  }

  const scopedTeamIds = await resolveScopedTeamIds(req);

  let where = `WHERE stp.season_id = @seasonId`;
  const params: any = { seasonId };

  if (Array.isArray(scopedTeamIds)) {
    if (scopedTeamIds.length === 0) {
      return res.json([]);
    }

    where += ` AND stp.team_id IN (${scopedTeamIds.map((_, i) => `@t${i}`).join(",")})`;
    scopedTeamIds.forEach((id, i) => {
      params[`t${i}`] = id;
    });
  }

  const result = await query(
    `
      SELECT
        stp.season_team_id,
        stp.season_id,
        t.team_id,
        t.name AS team_name
      FROM season_team_participants stp
      JOIN teams t ON stp.team_id = t.team_id
      ${where}
      ORDER BY t.name
    `,
    params
  );

  res.json(result.recordset);
}

export const registerExistingPlayer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      season_id,
      season_team_id,
      player_id,
      shirt_number,
      player_type,
      position_code // Added to support position code
    } = req.body;

    // Call consolidated service
    const created = await seasonPlayerRegistrationService.submitExistingPlayerRegistration({
      season_id: Number(season_id),
      season_team_id: Number(season_team_id),
      player_id: Number(player_id),
      position_code: String(position_code ?? "FW"), // Default if missing
      shirt_number: shirt_number === "" || shirt_number == null ? null : Number(shirt_number),
      player_type: String(player_type ?? "domestic"),
      currentUser: req.user!
    });

    res.status(201).json({
      message: "Player registered successfully",
      registration_id: created.registration_id,
    });
  } catch (err) {
    next(err);
  }
};
