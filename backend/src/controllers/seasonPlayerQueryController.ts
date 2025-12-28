import { Request, Response } from "express";
import {
    getSeasonPlayers,
    getSeasonTeams,
    getApprovedSeasonPlayersForAdminTeam,
    SeasonPlayerQueryFilters
} from "../services/seasonPlayerQueryService";
import { BadRequestError } from "../utils/httpError";
import { AuthenticatedRequest } from "../types";

export async function listSeasonPlayers(req: Request, res: Response): Promise<void> {
    const { seasonId } = req.params;

    if (!seasonId || isNaN(Number(seasonId))) {
        throw BadRequestError("INVALID_SEASON_ID");
    }

    const numericSeasonId = Number(seasonId);

    // team_id (optional)
    const teamIdRaw = req.query.team_id as string | undefined;
    const teamId = teamIdRaw !== undefined ? Number(teamIdRaw) : undefined;
    if (teamId !== undefined && isNaN(teamId)) {
        throw BadRequestError("INVALID_TEAM_ID");
    }

    // position_code (optional)
    const positionCode = req.query.position_code as string | undefined;

    // nationality_type (optional) - chỉ nhận 'foreign' | 'domestic'
    const nationalityTypeRaw = req.query.nationality_type as string | undefined;

    let nationality_type: "foreign" | "domestic" | undefined = undefined;
    if (nationalityTypeRaw !== undefined && nationalityTypeRaw !== null && nationalityTypeRaw !== "") {
        const normalized = String(nationalityTypeRaw).toLowerCase();
        if (normalized !== "foreign" && normalized !== "domestic") {
            throw BadRequestError("INVALID_NATIONALITY_TYPE");
        }
        nationality_type = normalized as "foreign" | "domestic";
    }

    const filters: SeasonPlayerQueryFilters = {
        team_id: teamId,
        position_code: positionCode,
        nationality_type
    };

    const players = await getSeasonPlayers(numericSeasonId, filters);

    res.json({
        season_id: numericSeasonId,
        total: players.length,
        players
    });
}

/**
 * Super Admin: List all approved players for a season
 * GET /api/season-players/approved?season_id=...
 */
/**
 * Super Admin: List all approved players for a season
 * GET /api/season-players/approved?season_id=...
 */
export async function listApprovedSeasonPlayers(req: Request, res: Response): Promise<void> {
    const seasonId = req.query.season_id ? Number(req.query.season_id) : undefined;

    if (!seasonId || isNaN(seasonId)) {
        throw BadRequestError("Season ID is required");
    }

    // Reuse filter logic
    const teamIdRaw = req.query.team_id as string | undefined;
    const teamId = teamIdRaw !== undefined ? Number(teamIdRaw) : undefined;
    if (teamId !== undefined && isNaN(teamId)) {
        throw BadRequestError("INVALID_TEAM_ID");
    }

    const positionCode = req.query.position_code as string | undefined;

    const nationalityTypeRaw = req.query.nationality_type as string | undefined;
    let nationality_type: "foreign" | "domestic" | undefined = undefined;
    if (nationalityTypeRaw) {
        const normalized = String(nationalityTypeRaw).toLowerCase();
        if (normalized === "foreign" || normalized === "domestic") {
            nationality_type = normalized as "foreign" | "domestic";
        }
    }

    const filters: SeasonPlayerQueryFilters = {
        team_id: teamId,
        position_code: positionCode,
        nationality_type
    };

    const players = await getSeasonPlayers(seasonId, filters);

    res.json({
        season_id: seasonId,
        total: players.length,
        players
    });
}

/**
 * Admin Team: List my team's approved players
 * GET /api/season-players/my-team/approved?season_id=...
 */
export async function listMyTeamApprovedSeasonPlayers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const seasonId = req.query.season_id ? Number(req.query.season_id) : undefined;

    if (!seasonId || isNaN(seasonId)) {
        throw BadRequestError("Season ID is required");
    }

    if (!req.user || !req.user.teamIds || req.user.teamIds.length === 0) {
        // No teams assigned
        res.json({ season_id: seasonId, total: 0, players: [] });
        return;
    }

    const teamIdParam = req.query.team_id ? Number(req.query.team_id) : undefined;

    let targetTeamIds = req.user.teamIds;

    // If filter by specific team, ensure it belongs to user
    if (teamIdParam) {
        if (!targetTeamIds.includes(teamIdParam)) {
            // Not allowed to view this team
            targetTeamIds = [];
        } else {
            targetTeamIds = [teamIdParam];
        }
    }

    const players = await getApprovedSeasonPlayersForAdminTeam(seasonId, targetTeamIds);

    res.json({
        season_id: seasonId,
        total: players.length,
        players
    });
}


export async function listSeasonTeams(req: Request, res: Response): Promise<void> {
    const { seasonId } = req.params;

    if (!seasonId || isNaN(Number(seasonId))) {
        throw BadRequestError("INVALID_SEASON_ID");
    }

    const teams = await getSeasonTeams(Number(seasonId));

    res.json({
        season_id: Number(seasonId),
        count: teams.length,
        teams
    });
}
