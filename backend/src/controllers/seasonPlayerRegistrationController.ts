import { Request, Response, NextFunction } from "express";
import {
    getPendingRegistrations,
    approveRegistration,
    rejectRegistration,
    approveAllPendingRegistrations,
    importSeasonPlayersFromCSV,
    submitExistingPlayerRegistration,
    removeRegistration,
    updateApprovedRegistration
} from "../services/seasonPlayerRegistrationService";
import { query } from "../db/sqlServer";
import { getUserTeamIds } from "../services/userTeamService";
import { BadRequestError, ForbiddenError } from "../utils/httpError";
import { AuthenticatedRequest } from "../types";

/**
 * Register player for a season
 */
export async function register(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    // =========================
    // 0. Validate file
    // =========================
    const file = req.file;
    if (!file) {
        throw BadRequestError("File is required (PDF format)");
    }

    // =========================
    // 1. Extract body
    // =========================
    const {
        player_id,
        season_id,
        season_team_id,
        position_code,
        shirt_number,
        player_type
    } = req.body;

    // =========================
    // 2. Validate required fields
    // =========================
    if (
        !player_id ||
        !season_id ||
        !season_team_id ||
        !position_code ||
        !player_type
    ) {
        throw BadRequestError(
            "Missing required fields: player_id, season_id, season_team_id, position_code, player_type"
        );
    }

    // =========================
    // 3. Convert & validate numeric fields
    // =========================
    const numericPlayerId = Number(player_id);
    const numericSeasonId = Number(season_id);
    const numericSeasonTeamId = Number(season_team_id);

    if (
        isNaN(numericPlayerId) ||
        isNaN(numericSeasonId) ||
        isNaN(numericSeasonTeamId)
    ) {
        throw BadRequestError(
            "player_id, season_id, season_team_id must be numbers"
        );
    }



    // =========================
    // 4. Validate player_type
    // =========================
    const normalizedPlayerType =
        typeof player_type === "string"
            ? player_type.toLowerCase()
            : "";

    if (normalizedPlayerType !== "foreign" && normalizedPlayerType !== "domestic") {
        throw BadRequestError("player_type must be 'foreign' or 'domestic'");
    }

    // =========================
    let numericShirtNumber: number | null = null;
    if (shirt_number !== undefined && shirt_number !== null && String(shirt_number).trim() !== "") {
        const parsed = Number(shirt_number);
        if (Number.isNaN(parsed)) throw BadRequestError("shirt_number must be a number");
        numericShirtNumber = parsed;
    }

    // =========================
    // 5. Get user from auth
    // =========================
    const userId = req.user?.sub;
    const username = req.user?.username;

    // =========================
    // 6. Call service
    // =========================
    await submitExistingPlayerRegistration({
        season_id: numericSeasonId,
        season_team_id: numericSeasonTeamId,
        player_id: numericPlayerId,
        position_code,
        shirt_number: numericShirtNumber,
        player_type: normalizedPlayerType,
        file_path: file.path,
        currentUser: {
            sub: userId!,
            username: username,
            roles: req.user?.roles,
            teamIds: req.user?.teamIds
        }
    });

    // =========================
    // 7. Response
    // =========================
    res.status(201).json({
        message: "Player registered successfully"
    });
}

/**
 * Get all pending season player registrations
 */
export async function listPending(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const data = await getPendingRegistrations();
    res.json(data);
}

/**
 * Approve a season player registration
 */
export async function approve(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const numericId = Number(req.params.id);

    if (isNaN(numericId)) {
        throw BadRequestError("Invalid registration id");
    }

    const userId = req.user?.sub;

    await approveRegistration(numericId, userId);

    res.json({ message: "Approved successfully" });
}

/**
 * Reject a season player registration
 */
export async function reject(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const numericId = Number(req.params.id);
    const { reason } = req.body;

    if (isNaN(numericId)) {
        throw BadRequestError("Invalid registration id");
    }

    if (!reason) {
        throw BadRequestError("Reject reason is required");
    }

    const userId = req.user?.sub;

    await rejectRegistration(numericId, reason, userId);

    res.json({ message: "Rejected successfully" });
}

/**
 * Approve all pending registrations
 */
export async function approveAll(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const userId = req.user?.sub;

    await approveAllPendingRegistrations(userId);

    res.json({
        message: "Approved all pending registrations",
    });
}

/**
 * Import season players from CSV
 */
export async function importCSV(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const file = req.file;
    if (!file) {
        throw BadRequestError("File is required (CSV format)");
    }

    const { season_id, season_team_id } = req.body;
    if (!season_id || !season_team_id) {
        throw BadRequestError("season_id and season_team_id are required");
    }

    const numericSeasonId = Number(season_id);
    const numericSeasonTeamId = Number(season_team_id);

    if (isNaN(numericSeasonId) || isNaN(numericSeasonTeamId)) {
        throw BadRequestError("season_id and season_team_id must be numbers");
    }

    const userId = req.user?.sub;
    const username = req.user?.username;

    // Note: Permission check moved to service
    const result = await importSeasonPlayersFromCSV({
        season_id: numericSeasonId,
        season_team_id: numericSeasonTeamId,
        file_buffer: file.buffer,
        file_path: file.path,
        user_id: userId,
        username,
        currentUser: {
            sub: req.user!.sub,
            username: req.user?.username,
            roles: req.user?.roles,
            teamIds: req.user?.teamIds
        }
    });

    res.json(result);
}

/**
 * Remove (Soft-Remove) a player from season
 */
export async function remove(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const numericId = Number(req.params.id);

    if (isNaN(numericId)) {
        throw BadRequestError("Invalid registration id");
    }

    const userId = req.user?.sub;

    await removeRegistration(numericId, userId);

    res.json({ message: "Player removed from season successfully" });
}

export async function update(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const id = Number(req.params.id);
        const { shirt_number, position_code } = req.body;

        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "Invalid id" });
        }

        if (
            !Number.isInteger(parseInt(shirt_number)) ||
            parseInt(shirt_number) < 1 ||
            parseInt(shirt_number) > 99
        ) {
            return res.status(400).json({ error: "Invalid shirt number" });
        }

        if (!position_code) {
            return res.status(400).json({ error: "position_code is required" });
        }

        await updateApprovedRegistration(id, {
            shirt_number: parseInt(shirt_number),
            position_code
        });

        res.json({ message: "Player updated in season successfully" });
    } catch (err: any) {
        if (err.message === "NOT_FOUND_OR_NOT_APPROVED") {
            return res.status(404).json({ error: "Registration not found or not approved" });
        }
        next(err);
    }
}
