import { Request, Response } from 'express';
import { getMatchLineups, getMatchTeamInfo, submitLineup } from '../services/matchLineupService';
import { getMatchById } from '../services/matchService';

export const getLineup = async (req: Request, res: Response) => {
    try {
        const { matchId, seasonTeamId } = req.params;
        const lineups = await getMatchLineups(Number(matchId));
        const teamInfo = await getMatchTeamInfo(Number(matchId), Number(seasonTeamId));

        // Filter lineups for this team
        const teamLineups = lineups.filter(l => l.seasonTeamId === Number(seasonTeamId));

        const starters = teamLineups.filter(l => l.isStarting).map(l => l.playerId);
        const substitutes = teamLineups.filter(l => !l.isStarting).map(l => l.playerId);

        res.json({
            formation: teamInfo?.formation || '4-4-2',
            starters,
            substitutes
        });
    } catch (error) {
        console.error("Error fetching lineup:", error);
        res.status(500).json({ message: "Failed to fetch lineup" });
    }
};

export const updateLineup = async (req: Request, res: Response) => {
    try {
        const { matchId, seasonTeamId } = req.params;
        const { formation, starters, substitutes, seasonId, kitType } = req.body;

        if (!formation || !Array.isArray(starters) || !Array.isArray(substitutes)) {
            return res.status(400).json({ message: "Invalid payload" });
        }

        if (starters.length !== 11) {
            return res.status(400).json({ message: "Must select exactly 11 starters" });
        }

        if (substitutes.length > 5) {
            return res.status(400).json({ message: "Max 5 substitutes allowed" });
        }

        const userId = (req as any).user?.sub;
        if (!userId) { // Should be caught by requireAuth but safe check
            return res.status(401).json({ message: "User not authenticated" });
        }

        // Get match to find seasonId if not provided
        let finalSeasonId = seasonId;
        if (!finalSeasonId) {
            const match = await getMatchById(Number(matchId));
            if (!match) {
                return res.status(404).json({ message: "Match not found" });
            }
            finalSeasonId = match.seasonId;
        }

        await submitLineup({
            matchId: Number(matchId),
            seasonId: finalSeasonId,
            seasonTeamId: Number(seasonTeamId),
            formation,
            kitType: kitType || 'HOME',
            startingPlayerIds: starters,
            substitutePlayerIds: substitutes
        }, userId);

        res.json({ message: "Lineup saved successfully" });
    } catch (error: any) {
        console.error("[lineupController] Error saving lineup:", error.message);
        console.error("[lineupController] Stack trace:", error.stack);
        console.error("[lineupController] Full error object:", JSON.stringify(error, null, 2));
        res.status(500).json({
            message: "Failed to save lineup",
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
