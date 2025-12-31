import { Router } from "express";
import { z } from "zod";
import { query } from "../db/sqlServer";
import * as eventService from "../services/matchEventService";
import * as lineupService from "../services/matchLineupService";
import * as statsService from "../services/playerMatchStatsService";
import { isPlayerSuspendedForMatch } from "../services/disciplinaryService";

const router = Router();

// --- EVENTS ---

const createEventSchema = z.object({
    matchId: z.number().int().positive(),
    seasonId: z.number().int().positive(),
    seasonTeamId: z.number().int().positive(),
    // Accept type as string (will be normalized by service)
    type: z.string().trim().min(1).max(32),
    minute: z.preprocess((val) => {
        if (val === undefined || val === null || val === '') return null
        const s = String(val)
        const digits = s.replace(/[^0-9]/g, '')
        if (digits === '') return null
        const n = Number(digits)
        return Number.isNaN(n) ? null : n
    }, z.number().int().min(0).max(130).nullable().optional()),
    description: z.string().optional(),
    playerId: z.preprocess((v) => {
        if (v === undefined || v === null || v === '') return null
        return Number(v)
    }, z.number().int().positive().nullable().optional()),
    assistPlayerId: z.number().int().positive().optional(),
    inPlayerId: z.number().int().positive().optional(),
    outPlayerId: z.number().int().positive().optional(),
});

router.get("/:matchId/events", async (req, res, next) => {
    try {
        const matchId = Number(req.params.matchId);
        const events = await eventService.getMatchEvents(matchId);
        res.json({ data: events });
    } catch (error) { next(error); }
});

router.post("/:matchId/events", async (req, res, next) => {
    try {
        const matchId = Number(req.params.matchId);
        const payload = createEventSchema.parse({ ...req.body, matchId });
        
        // Resolve teamId from seasonTeamId (service expects teamId)
        const teamData = await query<{ team_id: number }>(
            "SELECT team_id FROM season_team_participants WHERE season_team_id = @seasonTeamId",
            { seasonTeamId: payload.seasonTeamId }
        );
        const teamId = teamData.recordset[0]?.team_id;
        if (!teamId) {
            return res.status(400).json({ message: "Invalid seasonTeamId" });
        }
        
        // Cast type to satisfy TypeScript - service will normalize it
        const event = await eventService.createMatchEvent({
            matchId: payload.matchId,
            teamId,
            type: payload.type as any,
            minute: payload.minute ?? undefined, // Convert null to undefined
            description: payload.description,
            playerId: payload.playerId ?? undefined,
            assistPlayerId: payload.assistPlayerId,
            inPlayerId: payload.inPlayerId,
            outPlayerId: payload.outPlayerId
        });
        res.status(201).json({ data: event });
    } catch (error) { next(error); }
});

router.delete("/events/:eventId", async (req, res, next) => {
    try {
        const eventId = Number(req.params.eventId);
        await eventService.deleteMatchEvent(eventId);
        res.status(204).send();
    } catch (error) { next(error); }
});

// --- LINEUPS ---

router.get("/:matchId/lineups", async (req, res, next) => {
    try {
        const matchId = Number(req.params.matchId);
        const lineups = await lineupService.getMatchLineups(matchId);
        res.json({ data: lineups });
    } catch (error) { next(error); }
});

router.post("/:matchId/lineups", async (req, res, next) => {
    try {
        const matchId = Number(req.params.matchId);
        // Expecting array of players
        const payload = z.array(z.object({
            seasonTeamId: z.number(),
            playerId: z.number().optional(), // Legacy support
            seasonPlayerId: z.number().optional(), // Preferred
            isStarting: z.boolean(),
            isCaptain: z.boolean(),
            jerseyNumber: z.number().optional(),
            position: z.string().optional(),
            status: z.string().default('active'),
            seasonId: z.number()
        })).parse(req.body);

        // Check for suspended players before saving
        const suspendedPlayers = [];
        for (const item of payload) {
            const seasonPlayerId = item.seasonPlayerId || item.playerId;
            if (!seasonPlayerId) {
                continue; // Skip if no player ID
            }

            const suspensionCheck = await isPlayerSuspendedForMatch(
                item.seasonId,
                matchId,
                seasonPlayerId
            );

            if (suspensionCheck.suspended) {
                suspendedPlayers.push({
                    seasonPlayerId,
                    reason: suspensionCheck.reason
                });
            }
        }

        // If any suspended players, reject the lineup
        if (suspendedPlayers.length > 0) {
            return res.status(400).json({
                error: 'Lineup contains suspended players',
                suspendedPlayers: suspendedPlayers.map(sp => ({
                    seasonPlayerId: sp.seasonPlayerId,
                    reason: sp.reason,
                    message: sp.reason === 'RED_CARD' 
                        ? 'Player suspended due to red card'
                        : 'Player suspended due to accumulation of yellow cards'
                }))
            });
        }

        // Bulk upsert logic (loop for now)
        for (const item of payload) {
            await lineupService.upsertMatchLineup({ ...item, matchId });
        }

        res.json({ message: "Lineups updated" });
    } catch (error) { next(error); }
});

// --- STATS ---

router.get("/:matchId/stats", async (req, res, next) => {
    try {
        const matchId = Number(req.params.matchId);
        const stats = await statsService.getPlayerMatchStats(matchId);
        res.json({ data: stats });
    } catch (error) { next(error); }
});

router.put("/:matchId/stats/:playerId", async (req, res, next) => {
    try {
        const matchId = Number(req.params.matchId);
        const playerId = Number(req.params.playerId);
        const payload = req.body; // Weak validation here for dynamic stats, ideally stricter
        await statsService.updatePlayerStats(matchId, playerId, payload);
        res.json({ message: "Stats updated" });
    } catch (error) { next(error); }
});

export default router;
