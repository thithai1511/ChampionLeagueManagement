import { Response, NextFunction } from "express";
import { createPlayer } from "../services/internalPlayerService";
import { AuthenticatedRequest } from "../types";
import { ForbiddenError } from "../utils/httpError";

export const createPlayerHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { name, date_of_birth, nationality, position, position_code, internal_team_id, team_id } = req.body;

        // internal_team_id might be passed as team_id from frontend? User said `input.internal_team_id`
        // I will support both just in case, prioritizing internal_team_id
        const targetTeamId = Number(internal_team_id || team_id);

        // Basic Validation
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: "Name is required" });
        }

        if (!date_of_birth || typeof date_of_birth !== 'string') {
            return res.status(400).json({ error: "Date of birth is required" });
        }

        // Security Check: team_admin can only create for their own team
        if (req.user?.roles?.includes("team_admin")) {
            if (!targetTeamId) {
                throw ForbiddenError("Team ID is required for team admins");
            }
            if (!req.user.teamIds?.includes(targetTeamId)) {
                throw ForbiddenError("You can only create players for your own team");
            }
        }

        // Call service
        const player = await createPlayer({
            name,
            date_of_birth,
            nationality,
            position: position || position_code, // Support both
            internal_team_id: targetTeamId || undefined
        });

        res.status(201).json({
            message: "Player created successfully",
            data: player
        });
    } catch (error) {
        next(error);
    }
};
