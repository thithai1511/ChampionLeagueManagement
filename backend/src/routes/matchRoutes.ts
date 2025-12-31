import { Router, Response, NextFunction } from "express";
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
import { getMatchLineups, submitLineup, autoGenerateLineup } from "../services/matchLineupService";
import * as lineupService from "../services/matchLineupService";
const router = Router();
const requireMatchManagement = [requireAuth, requirePermission("manage_matches")];

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
    if (v === undefined || v === null || v === '') return null;
    return Number(v);
  }, z.number().int().positive().nullable().optional()),

  assistPlayerId: z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return null;
    return Number(v);
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
          me.season_team_id AS seasonTeamId,
          me.player_name AS player,
          me.event_type AS type,
          me.card_type AS cardType,
          me.event_minute AS minute,
          me.stoppage_time AS stoppageTime,
          me.description,
          me.player_id AS playerId,
          me.assist_player_id AS assistPlayerId,
          me.goal_type_code AS goalTypeCode,
          rgt.name AS goalTypeName,
          rgt.description AS goalTypeDescription
        FROM match_events me
        INNER JOIN season_team_participants stp ON me.season_team_id = stp.season_team_id
        LEFT JOIN ruleset_goal_types rgt ON me.ruleset_id = rgt.ruleset_id AND me.goal_type_code = rgt.code AND rgt.is_active = 1
        WHERE me.match_id = @matchId
        ORDER BY me.event_minute ASC, me.stoppage_time ASC, me.created_at ASC;`,
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
    res.json({ data: lineups });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/lineups", requireAuth, async (req: any, res, next) => {
  try {
    const matchId = Number(req.params.id);
    console.log(`[POST /:id/lineups] matchId=${matchId}`);
    if (!Number.isInteger(matchId) || matchId <= 0) {
      console.log(`[POST /:id/lineups] Invalid matchId`);
      return res.status(400).json({ message: "Invalid match id" });
    }

    const {
      seasonTeamId,
      seasonId,
      startingPlayerIds,
      substitutePlayerIds,
      formation,
      kitType,
    } = req.body ?? {};

    console.log(`[POST /:id/lineups] Payload:`, JSON.stringify(req.body, null, 2));

    if (
      !seasonTeamId ||
      !seasonId ||
      !Array.isArray(startingPlayerIds) ||
      !Array.isArray(substitutePlayerIds)
    ) {

      console.log(`[POST /:id/lineups] Missing required fields`, { seasonTeamId, seasonId, hasStarters: Array.isArray(startingPlayerIds), hasSubs: Array.isArray(substitutePlayerIds) });
      return res.status(400).json({
        message:
          "Invalid payload. Required: seasonTeamId, seasonId, startingPlayerIds[], substitutePlayerIds[]",
      });
    }

    // ================== CHECK TEAM ADMIN OWNERSHIP ==================
    if (Array.isArray(req.user?.roles) && req.user.roles.includes("team_admin")) {
      const stpResult = await query<{ team_id: number }>(
        `
        SELECT team_id
        FROM season_team_participants
        WHERE season_team_id = @seasonTeamId
        `,
        { seasonTeamId }
      );

      const teamIdOfSeasonTeam = stpResult.recordset[0]?.team_id;
      const allowedTeamIds: number[] = Array.isArray(req.user?.teamIds)
        ? req.user.teamIds
        : [];

      if (!teamIdOfSeasonTeam || !allowedTeamIds.includes(teamIdOfSeasonTeam)) {
        return res.status(403).json({
          error: "You are not allowed to perform this action",
          details: "Team admin cannot submit lineup for another team",
        });
      }
    }
    // ================== END CHECK ==================

    // Validate user ID
    if (!req.user?.sub || !Number.isInteger(req.user.sub)) {
      return res.status(401).json({
        message: "User authentication required",
        error: "Invalid or missing user ID"
      });
    }

    // Validate player IDs are numbers
    const allPlayerIds = [...startingPlayerIds, ...substitutePlayerIds];
    const invalidIds = allPlayerIds.filter(id => !id || !Number.isInteger(Number(id)));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: "Invalid player IDs",
        errors: [`Invalid player IDs found: ${invalidIds.join(', ')}`]
      });
    }

    try {
      const result = await submitLineup(
        {
          matchId,
          seasonId,
          seasonTeamId,
          startingPlayerIds: startingPlayerIds.map(id => Number(id)),
          substitutePlayerIds: substitutePlayerIds.map(id => Number(id)),
          formation,
          kitType,
        },
        Number(req.user.sub)
      );

      if (!result.success) {
        console.log(`[POST /:id/lineups] SubmitLineup failed:`, result.errors);
        return res.status(400).json({
          message: "Lineup validation failed",
          errors: result.errors,
        });
      }

      res.json({ message: "Lineup submitted successfully" });
    } catch (error: any) {
      console.error("[matchRoutes] Error submitting lineup:", error);
      console.error("[matchRoutes] Error stack:", error.stack);
      return res.status(500).json({
        message: "Lỗi máy chủ nội bộ",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/matches/:matchId/auto-generate-lineup
 * Auto generate lineup for a team (Super Admin only)
 */
router.post(
  "/:matchId/auto-generate-lineup",
  requireAuth,
  requireMatchManagement,
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const matchId = Number(req.params.matchId);
      const { seasonTeamId } = req.body;

      if (!Number.isInteger(matchId) || matchId <= 0) {
        return res.status(400).json({ message: "Invalid match id" });
      }

      if (!seasonTeamId) {
        return res.status(400).json({ message: "seasonTeamId is required" });
      }

      // Check if user is super admin
      const isSuperAdmin = Array.isArray(req.user?.roles) && req.user.roles.includes("super_admin");
      if (!isSuperAdmin) {
        return res.status(403).json({ error: "Only super admin can auto generate lineup" });
      }

      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const result = await autoGenerateLineup(matchId, seasonTeamId, userId);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
          data: result
        });
      }

      res.json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/:matchId/team-infos", async (req, res, next) => {
  try {
    const matchId = Number(req.params.matchId);
    if (!Number.isInteger(matchId) || matchId <= 0) {
      return res.status(400).json({ message: "Invalid match id" });
    }

    const result = await query<{
      match_id: number;
      home_season_team_id: number;
      away_season_team_id: number;
      home_formation: string | null;
      home_kit_type: string | null;
      away_formation: string | null;
      away_kit_type: string | null;
    }>(
      `
      SELECT
        m.match_id,
        m.home_season_team_id,
        m.away_season_team_id,
        hti.formation AS home_formation,
        hti.kit_type AS home_kit_type,
        ati.formation AS away_formation,
        ati.kit_type AS away_kit_type
      FROM matches m
      LEFT JOIN match_team_infos hti
        ON hti.match_id = m.match_id AND hti.season_team_id = m.home_season_team_id
      LEFT JOIN match_team_infos ati
        ON ati.match_id = m.match_id AND ati.season_team_id = m.away_season_team_id
      WHERE m.match_id = @matchId
      `,
      { matchId }
    );

    const row = result.recordset[0];
    if (!row) return res.status(404).json({ message: "Match not found" });

    res.json({
      data: {
        matchId: row.match_id,
        home: {
          seasonTeamId: row.home_season_team_id,
          formation: row.home_formation ?? null,
          kitType: row.home_kit_type ?? null,
        },
        away: {
          seasonTeamId: row.away_season_team_id,
          formation: row.away_formation ?? null,
          kitType: row.away_kit_type ?? null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:matchId/lineups/approval-status", requireAuth, async (req: any, res, next) => {
  try {
    const matchId = Number(req.params.matchId);
    if (!Number.isInteger(matchId) || matchId <= 0) {
      return res.status(400).json({ message: "Invalid match id" });
    }

    const statuses = await lineupService.getLineupApprovalStatus(matchId);
    res.json({ data: statuses });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:matchId/lineups/:teamType/approve",
  requireAuth,
  requirePermission("manage_matches"),
  async (req: any, res, next) => {
    try {
      const matchId = Number(req.params.matchId);
      const teamType = String(req.params.teamType || "").toLowerCase();

      if (!Number.isInteger(matchId) || matchId <= 0) {
        return res.status(400).json({ message: "Invalid match id" });
      }
      if (teamType !== "home" && teamType !== "away") {
        return res.status(400).json({ message: "teamType must be 'home' or 'away'" });
      }

      // (Optional) ensure lineup exists for that teamType before approving
      const exists = await query<{ cnt: number }>(
        `
        SELECT COUNT(*) AS cnt
        FROM match_lineups
        WHERE match_id = @matchId
          AND team_type = @teamType
        `,
        { matchId, teamType }
      );

      if ((exists.recordset[0]?.cnt || 0) === 0) {
        return res.status(400).json({
          message: "No lineup submitted for this team yet",
        });
      }

      await lineupService.approveLineup(matchId, teamType as "home" | "away", req.user?.sub);

      res.json({ message: "Lineup approved successfully" });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:matchId/lineups/:teamType/reject",
  requireAuth,
  requirePermission("manage_matches"),
  async (req: any, res, next) => {
    try {
      const matchId = Number(req.params.matchId);
      const teamType = String(req.params.teamType || "").toLowerCase();
      const reason = String(req.body?.reason || "").trim();

      if (!Number.isInteger(matchId) || matchId <= 0) {
        return res.status(400).json({ message: "Invalid match id" });
      }
      if (teamType !== "home" && teamType !== "away") {
        return res.status(400).json({ message: "teamType must be 'home' or 'away'" });
      }
      if (!reason) {
        return res.status(400).json({ message: "reason is required" });
      }

      const exists = await query<{ cnt: number }>(
        `
        SELECT COUNT(*) AS cnt
        FROM match_lineups
        WHERE match_id = @matchId
          AND team_type = @teamType
        `,
        { matchId, teamType }
      );

      if ((exists.recordset[0]?.cnt || 0) === 0) {
        return res.status(400).json({
          message: "No lineup submitted for this team yet",
        });
      }

      await lineupService.rejectLineup(matchId, teamType as "home" | "away", reason, req.user?.sub);

      res.json({ message: "Lineup rejected successfully" });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/:matchId/lineups/review", requireAuth, async (req: any, res, next) => {
  try {
    const matchId = Number(req.params.matchId);
    if (!Number.isInteger(matchId) || matchId <= 0) {
      return res.status(400).json({ message: "Invalid match id" });
    }

    // Lấy 2 team của match để biết season_team_id của home/away
    const matchResult = await query<{
      home_season_team_id: number;
      away_season_team_id: number;
    }>(
      `
      SELECT home_season_team_id, away_season_team_id
      FROM matches
      WHERE match_id = @matchId
      `,
      { matchId }
    );

    const match = matchResult.recordset[0];
    if (!match) return res.status(404).json({ message: "Match not found" });

    // Lấy trạng thái + lý do theo team_type (mỗi team lấy 1 dòng đại diện)
    const reviewResult = await query<{
      team_type: "home" | "away";
      approval_status: string | null;
      rejection_reason: string | null;
      approved_by: number | null;
      approved_at: string | null;
      submitted_at: string | null;
    }>(
      `
      SELECT
        team_type,
        MAX(approval_status) AS approval_status,
        MAX(rejection_reason) AS rejection_reason,
        MAX(approved_by) AS approved_by,
        MAX(approved_at) AS approved_at,
        MAX(submitted_at) AS submitted_at
      FROM match_lineups
      WHERE match_id = @matchId
        AND team_type IN ('home','away')
      GROUP BY team_type
      `,
      { matchId }
    );

    const map: any = {
      home: {
        seasonTeamId: match.home_season_team_id,
        status: "PENDING",
        rejectionReason: null,
        approvedBy: null,
        approvedAt: null,
        submittedAt: null,
      },
      away: {
        seasonTeamId: match.away_season_team_id,
        status: "PENDING",
        rejectionReason: null,
        approvedBy: null,
        approvedAt: null,
        submittedAt: null,
      },
    };

    for (const row of reviewResult.recordset) {
      map[row.team_type] = {
        ...map[row.team_type],
        status: row.approval_status ?? "PENDING",
        rejectionReason: row.rejection_reason ?? null,
        approvedBy: row.approved_by ?? null,
        approvedAt: row.approved_at ?? null,
        submittedAt: row.submitted_at ?? null,
      };
    }

    res.json({
      data: {
        matchId,
        home: map.home,
        away: map.away,
      },
    });
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
      minute: payload.minute ?? undefined, // Convert null to undefined
      description: payload.description ?? undefined,
      playerId: payload.playerId ?? undefined, // Pass raw player ID
      assistPlayerId: payload.assistPlayerId ?? undefined
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


export default router;
