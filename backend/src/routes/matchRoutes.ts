import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../middleware/authMiddleware";
import { query } from "../db/sqlServer";
import { logEvent } from "../services/auditService";
import {
  createMatch,
  deleteMatch,
  getMatchById,
  listLiveMatches,
  listMatches,
  generateRandomMatches,
  generateRoundRobinSchedule,
  createBulkMatches,
  updateMatch,
  listFootballMatches,
  deleteAllMatches,

} from "../services/matchService";
import { syncMatchesOnly } from "../services/syncService";
import { createMatchEvent, deleteMatchEvent, disallowMatchEvent } from "../services/matchEventService";
import { getMatchLineups, submitLineup } from "../services/matchLineupService";
import * as lineupService from "../services/matchLineupService";
import { isPlayerSuspendedForMatch } from "../services/disciplinaryService";

const router = Router();
const requireMatchManagement = [requireAuth, requirePermission("manage_matches")] as const;

const isValidDate = (value: string): boolean => !Number.isNaN(Date.parse(value));

const listQuerySchema = z.object({
  status: z.string().trim().optional(),
  seasonId: z
    .string()
    .trim()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().int().positive().optional())
    .optional(),
  search: z.string().trim().optional(),
  teamId: z
    .string()
    .trim()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().int().positive().optional())
    .optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  page: z
    .string()
    .trim()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().int().positive().optional())
    .optional(),
  limit: z
    .string()
    .trim()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().int().positive().optional())
    .optional(),
  showUnknown: z
    .string()
    .trim()
    .optional()
    .transform((value) => value === "true" || value === "1"),
});

const externalMatchesQuerySchema = z.object({
  status: z.string().trim().optional(),
  season: z.string().trim().optional(),
  search: z.string().trim().optional(),
  teamId: z
    .string()
    .trim()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().int().positive().optional())
    .optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  page: z
    .string()
    .trim()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().int().positive().optional())
    .optional(),
  limit: z
    .string()
    .trim()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().int().positive().optional())
    .optional(),
  showUnknown: z
    .string()
    .trim()
    .optional()
    .transform((value) => value === "true" || value === "1"),
});

const createSchema = z.object({
  homeTeamId: z.number().int().positive(),
  awayTeamId: z.number().int().positive(),
  scheduledKickoff: z
    .string()
    .trim()
    .refine((value) => isValidDate(value), { message: "scheduledKickoff must be a valid ISO date string" }),
  seasonId: z.number().int().positive().optional(),
  roundNumber: z.number().int().positive().optional(),
  matchdayNumber: z.number().int().positive().optional(),
  stadiumId: z.number().int().positive().optional(),
  status: z.string().trim().optional(),
});

const generateSchema = z.object({
  count: z.number().int().positive().optional(),
  seasonId: z.number().int().positive().optional(),
  startDate: z
    .string()
    .trim()
    .optional()
    .refine((value) => (value ? isValidDate(value) : true), { message: "startDate must be a valid ISO date" }),
});

const syncSchema = z.object({
  season: z.string().trim().optional(),
  status: z.string().trim().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
});

const updateSchema = z.object({
  status: z.string().trim().optional(),
  homeScore: z.number().int().nonnegative().nullable().optional(),
  awayScore: z.number().int().nonnegative().nullable().optional(),
  attendance: z.number().int().nonnegative().nullable().optional(),
  scheduledKickoff: z
    .string()
    .trim()
    .optional()
    .refine((value) => (value ? isValidDate(value) : true), { message: "scheduledKickoff must be a valid ISO date" }),
  stadiumId: z.number().int().positive().optional(),
  description: z.string().trim().optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const filters = listQuerySchema.parse(req.query);
    const result = await listMatches(filters);
    res.json({
      data: result.data,
      total: result.total,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/live", async (_req, res, next) => {
  try {
    const matches = await listLiveMatches();
    res.json({ data: matches, total: matches.length });
  } catch (error) {
    next(error);
  }
});

router.get("/external", async (req, res, next) => {
  try {
    const filters = externalMatchesQuerySchema.parse(req.query);
    const result = await listFootballMatches(filters);
    res.json({
      data: result.data,
      total: result.total,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

const createEventSchema = z.object({
  teamId: z.number().int().positive(),
  // Accept type as string; we'll normalize later in the handler
  type: z.string().trim().min(1).max(32),
  // Accept minute as string or number or empty; normalize to number|null
  minute: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return null
    // If it's a string like "45+1" or "90+3", extract digits
    const s = String(val)
    const digits = s.replace(/[^0-9]/g, '')
    if (digits === '') return null
    const n = Number(digits)
    return Number.isNaN(n) ? null : n
  }, z.number().int().min(0).max(130).nullable().optional()),
  description: z.string().trim().max(255).optional().nullable(),
  playerId: z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return null
    return Number(v)
  }, z.number().int().positive().nullable().optional()),
  playerName: z.string().trim().max(100).optional().nullable(),
});

router.get("/:id/events", async (req, res, next) => {
  try {
    const matchId = Number(req.params.id);
    if (!Number.isInteger(matchId) || matchId <= 0) {
      return res.status(400).json({ message: "Invalid match id" });
    }

    const eventsResult = await query(
      `SELECT
          me.match_event_id AS id,
          stp.team_id AS teamId,
          me.player_name AS player,
          me.event_type AS type,
          me.card_type AS cardType,
          me.event_minute AS minute,
          me.description
        FROM match_events me
        INNER JOIN season_team_participants stp ON me.season_team_id = stp.season_team_id
        WHERE me.match_id = @matchId
        ORDER BY me.event_minute ASC, me.created_at ASC;`,
      { matchId },
    );

    res.json({ data: eventsResult.recordset });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/lineups", async (req, res, next) => {
  try {
    const matchId = Number(req.params.id);
    if (!Number.isInteger(matchId) || matchId <= 0) {
      return res.status(400).json({ message: "Invalid match id" });
    }
    const lineups = await getMatchLineups(matchId);
    console.log(`[GET Lineups] Match ${matchId}: Retrieved ${lineups.length} lineups`);
    console.log(`[GET Lineups] First item:`, lineups[0]);
    res.json({ data: lineups });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/lineups", ...requireMatchManagement, async (req: any, res, next) => {
  try {
    const matchId = Number(req.params.id);
    if (!Number.isInteger(matchId) || matchId <= 0) {
      return res.status(400).json({ message: "Invalid match id" });
    }

    console.log('[Lineup Save] Received payload:', JSON.stringify(req.body, null, 2));

    // Expected body: { seasonTeamId, seasonId, startingPlayerIds, substitutePlayerIds }
    const { seasonTeamId, seasonId, startingPlayerIds, substitutePlayerIds } = req.body;

    if (!seasonTeamId || !seasonId || !Array.isArray(startingPlayerIds) || !Array.isArray(substitutePlayerIds)) {
      return res.status(400).json({ message: "Invalid payload. Required: seasonTeamId, seasonId, startingPlayerIds[], substitutePlayerIds[]" });
    }

    const result = await submitLineup({
      matchId,
      seasonId,
      seasonTeamId,
      startingPlayerIds,
      substitutePlayerIds
    }, req.user?.sub);

    console.log('[Lineup Save] Validation result:', result);

    if (!result.success) {
      console.log('[Lineup Save] Validation failed:', result.errors);
      return res.status(400).json({ message: "Lineup validation failed", errors: result.errors });
    }

    res.json({ message: "Lineup submitted successfully" });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/events", ...requireMatchManagement, async (req: any, res, next) => {
  try {
    const matchId = Number(req.params.id);
    if (!Number.isInteger(matchId) || matchId <= 0) {
      return res.status(400).json({ message: "Invalid match id" });
    }

    const payload = createEventSchema.parse(req.body ?? {});
    const eventType = payload.type.toUpperCase();

    const matchInfo = await query<{
      seasonId: number;
      homeTeamId: number;
      awayTeamId: number;
      homeSeasonTeamId: number;
      awaySeasonTeamId: number;
      status: string;
      rulesetId: number; // Fetch rulesetId
    }>(
      `SELECT
          m.season_id AS seasonId,
          hstp.team_id AS homeTeamId,
          astp.team_id AS awayTeamId,
          m.home_season_team_id AS homeSeasonTeamId,
          m.away_season_team_id AS awaySeasonTeamId,
          m.status,
          m.ruleset_id AS rulesetId 
        FROM matches m
        INNER JOIN season_team_participants hstp ON m.home_season_team_id = hstp.season_team_id
        INNER JOIN season_team_participants astp ON m.away_season_team_id = astp.season_team_id
        WHERE m.match_id = @matchId;`,
      { matchId },
    );

    const match = matchInfo.recordset[0];
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    // Call Service
    const newEvent = await createMatchEvent({
      matchId,
      teamId: payload.teamId,
      type: eventType as any,
      minute: payload.minute,
      description: payload.description ?? undefined,
      playerId: payload.playerId ?? undefined // Pass raw player ID, service resolves name/seasonPlayerId
    });

    let playerName: string | null = payload.playerName ? payload.playerName.trim() : null;
    if (!playerName && payload.playerId) {
      const player = await query<{ full_name: string }>(
        `SELECT TOP 1 full_name FROM players WHERE player_id = @playerId;`,
        { playerId: payload.playerId },
      );
      playerName = player.recordset[0]?.full_name ?? null;
    }

    // Let's rely on the service to do the INSERT.
    // And here do the update based on what we know.

    // Auto-transition scheduled -> in_progress once an event arrives.
    if (match.status === "scheduled") {
      await query(
        `UPDATE matches SET status = 'in_progress', updated_at = SYSUTCDATETIME() WHERE match_id = @matchId;`,
        { matchId },
      );
    }

    await logEvent({
      eventType: "MATCH_EVENT_CREATED",
      severity: "info",
      actorId: req.user?.sub,
      actorUsername: req.user?.username,
      actorRole: Array.isArray(req.user?.roles) ? req.user.roles[0] : undefined,
      entityType: "MATCH",
      entityId: String(matchId),
      payload: {
        id: newEvent.matchEventId,
        teamId: payload.teamId,
        type: eventType,
        minute: payload.minute,
        playerId: payload.playerId,
      },
    });

    res.status(201).json({
      data: {
        id: newEvent.matchEventId,
        teamId: payload.teamId,
        player: (newEvent as any).playerName, // Service adds this
        type: eventType,
        minute: payload.minute,
        description: payload.description ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/events/:id/disallow", ...requireMatchManagement, async (req, res, next) => {
  try {
    const eventId = Number(req.params.id);
    const { reason } = req.body;

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ message: "Invalid event id" });
    }
    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const disallowedEvent = await disallowMatchEvent(eventId, reason);
    if (!disallowedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }



    await logEvent({
      eventType: "MATCH_EVENT_UPDATED",
      severity: "info",
      actorId: (req as any).user?.sub,
      actorUsername: (req as any).user?.username,
      actorRole: Array.isArray((req as any).user?.roles) ? (req as any).user.roles[0] : undefined,
      entityType: "MATCH",
      entityId: String(disallowedEvent.matchId),
      payload: { id: eventId, type: 'DISALLOWED', reason },
    });

    res.json({ message: "Goal disallowed successfully" });
  } catch (error) {
    next(error);
  }
});

router.delete("/events/:id", ...requireMatchManagement, async (req, res, next) => {
  try {
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const deletedEvent = await deleteMatchEvent(eventId);
    if (!deletedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }



    await logEvent({
      eventType: "MATCH_EVENT_DELETED",
      severity: "info",
      actorId: (req as any).user?.sub,
      actorUsername: (req as any).user?.username,
      actorRole: Array.isArray((req as any).user?.roles) ? (req as any).user.roles[0] : undefined,
      entityType: "MATCH",
      entityId: String(deletedEvent.matchId),
      payload: { id: eventId, type: deletedEvent.type },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post("/", ...requireMatchManagement, async (req, res, next) => {
  try {
    const payload = createSchema.parse(req.body ?? {});
    const match = await createMatch(payload);
    res.status(201).json({ data: match });
  } catch (error) {
    next(error);
  }
});

router.post("/generate/random", ...requireMatchManagement, async (req, res, next) => {
  try {
    const payload = generateSchema.parse(req.body ?? {});
    const result = await generateRandomMatches(payload);
    res.status(201).json({
      message: "Random matches generated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

const generateRoundRobinSchema = z.object({
  teamIds: z.array(z.number().int().positive()).min(2),
  seasonId: z.number().int().positive().nullable().optional(),
  startDate: z
    .string()
    .trim()
    .nullable()
    .optional()
    .refine((value) => (value ? isValidDate(value) : true), { message: "startDate must be a valid ISO date" }),
});

router.post("/generate/round-robin", ...requireMatchManagement, async (req, res, next) => {
  try {
    const payload = generateRoundRobinSchema.parse(req.body ?? {});
    const result = await generateRoundRobinSchedule({
      teamIds: payload.teamIds,
      seasonId: payload.seasonId ?? undefined,
      startDate: payload.startDate ?? undefined,
    });
    res.json({
      message: "Round robin schedule generated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/bulk", ...requireMatchManagement, async (req, res, next) => {
  try {
    const payload = req.body;
    const matches = Array.isArray(payload) ? payload : payload.matches;

    if (!Array.isArray(matches)) {
      return res.status(400).json({ message: "Body must be an array of matches or an object with a 'matches' array property" });
    }
    const count = await createBulkMatches(matches);
    res.status(201).json({ count });
  } catch (error) {
    console.error('[BulkCreate] Error:', error);
    res.status(500).json({
      message: "Failed to create bulk matches",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post("/sync", ...requireMatchManagement, async (req, res, next) => {
  try {
    const payload = syncSchema.parse(req.body ?? {});
    const result = await syncMatchesOnly(
      payload.season,
      payload.status,
      payload.dateFrom,
      payload.dateTo
    );

    if (result.success) {
      res.json({
        success: true,
        message: "Matches synced successfully",
        data: result,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Matches sync failed",
        data: result,
      });
    }
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid match id" });
    }
    const match = await getMatchById(id);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }
    res.json({ data: match });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", ...requireMatchManagement, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid match id" });
    }
    const payload = updateSchema.parse(req.body ?? {});
    const updated = await updateMatch(id, payload);
    if (!updated) {
      return res.status(404).json({ message: "Match not found" });
    }
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/results", ...requireMatchManagement, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid match id" });
    }
    const payload = updateSchema.parse(req.body ?? {});
    const updated = await updateMatch(id, payload);
    if (!updated) {
      return res.status(404).json({ message: "Match not found" });
    }
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete("/bulk", ...requireMatchManagement, async (req, res, next) => {
  try {
    const seasonId = req.query.seasonId ? Number(req.query.seasonId) : undefined;
    const count = await deleteAllMatches(seasonId);
    res.json({ message: "Matches deleted successfully", count });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", ...requireMatchManagement, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid match id" });
    }
    const deleted = await deleteMatch(id);
    if (!deleted) {
      return res.status(404).json({ message: "Match not found" });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============ LINEUPS ROUTES ============

/**
 * GET /api/matches/:matchId/lineups
 * Get lineups for a match
 */
router.get("/:matchId/lineups", async (req, res, next) => {
  try {
    const matchId = Number(req.params.matchId);
    if (!Number.isInteger(matchId) || matchId <= 0) {
      return res.status(400).json({ message: "Invalid match id" });
    }
    const lineups = await lineupService.getMatchLineups(matchId);
    res.json({ data: lineups });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/matches/:matchId/lineups
 * Submit lineups for a match
 */
router.post("/:matchId/lineups", requireAuth, async (req, res, next) => {
  try {
    const matchId = Number(req.params.matchId);
    if (!Number.isInteger(matchId) || matchId <= 0) {
      return res.status(400).json({ message: "Invalid match id" });
    }

    const lineupSchema = z.array(z.object({
      seasonTeamId: z.number(),
      playerId: z.number().optional(),
      seasonPlayerId: z.number().optional(),
      isStarting: z.boolean(),
      isCaptain: z.boolean(),
      jerseyNumber: z.number().optional(),
      position: z.string().optional(),
      status: z.string().default('active'),
      seasonId: z.number()
    }));

    const payload = lineupSchema.parse(req.body);

    // Check for suspended players before saving
    const suspendedPlayers = [];
    for (const item of payload) {
      const seasonPlayerId = item.seasonPlayerId || item.playerId;
      if (!seasonPlayerId) continue;

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

    // Reject if any suspended players
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

    // Upsert lineups
    for (const item of payload) {
      await lineupService.upsertMatchLineup({ ...item, matchId });
    }

    res.json({ message: "Lineups updated" });
  } catch (error) {
    next(error);
  }
});

export default router;
