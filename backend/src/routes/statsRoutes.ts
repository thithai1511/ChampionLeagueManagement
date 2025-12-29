import { Router } from "express";
import { requireAnyPermission, requireAuth, requirePermission } from "../middleware/authMiddleware";
import { query } from "../db/sqlServer";
import {
  addPlayerStat,
  deletePlayerStat,
  getPlayerStatDetail,
  listPlayerStats,
  updatePlayerStat,
} from "../services/playerStatsService";
import {
  getCardStatsBySeason,
  getTopScorersBySeason,
  getMotmStatsBySeason,
  getSuspendedPlayers,
  getSeasonStatsOverview,
} from "../services/playerStatsAggregateService";

const router = Router();
const requireStatsRead = [
  requireAuth,
  requireAnyPermission(
    "manage_users",
    "manage_teams",
    "manage_matches",
    "manage_content",
    "manage_rulesets",
    "view_audit_logs",
  ),
] as const;
const requireStatsWrite = [requireAuth, requirePermission("manage_matches")] as const;

const parseCategory = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const parseSeason = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

router.get("/players", async (req, res, next) => {
  try {
    const category = parseCategory(req.query.category);
    const season = parseSeason(req.query.season);
    const data = await listPlayerStats(season, category as any);
    res.json({ data, meta: { season: season ?? undefined } });
  } catch (error) {
    next(error);
  }
});

router.post("/players", ...requireStatsWrite, async (req, res, next) => {
  try {
    const entry = await addPlayerStat(req.body);
    res.status(201).json({ data: entry });
  } catch (error) {
    next(error);
  }
});

router.put("/players/:id", ...requireStatsWrite, async (req, res, next) => {
  try {
    const updated = await updatePlayerStat(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: "Player stat not found" });
    }
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete("/players/:id", ...requireStatsWrite, async (req, res, next) => {
  try {
    const removed = await deletePlayerStat(req.params.id);
    if (!removed) {
      return res.status(404).json({ message: "Player stat not found" });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/players/:id", async (req, res, next) => {
  try {
    const detail = await getPlayerStatDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({ message: "Player stat not found" });
    }
    res.json({ data: detail });
  } catch (error) {
    next(error);
  }
});

router.get("/overview", ...requireStatsRead, async (req, res, next) => {
  try {
    const parseDate = (value: unknown) => {
      if (typeof value !== "string" || !value.trim()) {
        return null;
      }
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const start = parseDate(req.query.start);
    const end = parseDate(req.query.end);

    const applyRange = Boolean(start && end && start <= end);
    const startDate = applyRange ? start : null;
    const endDate = applyRange ? end : null;

    const [teamsResult, playersResult] = await Promise.all([
      query<{ total: number }>(`SELECT COUNT(1) AS total FROM teams;`),
      query<{ total: number }>(`SELECT COUNT(1) AS total FROM players;`),
    ]);

    const matchesResult = await query<{ totalMatches: number; totalGoals: number }>(
      `SELECT
          COUNT(1) AS totalMatches,
          SUM(COALESCE(home_score, 0) + COALESCE(away_score, 0)) AS totalGoals
        FROM matches
        WHERE (@start IS NULL OR scheduled_kickoff >= @start)
          AND (@end IS NULL OR scheduled_kickoff <= @end);`,
      { start: startDate, end: endDate },
    );

    const totals = {
      teams: teamsResult.recordset[0]?.total ?? 0,
      players: playersResult.recordset[0]?.total ?? 0,
      matches: matchesResult.recordset[0]?.totalMatches ?? 0,
      goals: matchesResult.recordset[0]?.totalGoals ?? 0,
    };

    const trends = {
      teams: 0,
      players: 0,
      matches: 0,
      goals: 0,
    };

    if (applyRange && start && end) {
      const durationMs = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - durationMs);
      const prevEnd = new Date(start.getTime());

      const prevMatches = await query<{ totalMatches: number; totalGoals: number }>(
        `SELECT
            COUNT(1) AS totalMatches,
            SUM(COALESCE(home_score, 0) + COALESCE(away_score, 0)) AS totalGoals
          FROM matches
          WHERE scheduled_kickoff >= @start
            AND scheduled_kickoff <= @end;`,
        { start: prevStart, end: prevEnd },
      );

      const prevTotals = {
        matches: prevMatches.recordset[0]?.totalMatches ?? 0,
        goals: prevMatches.recordset[0]?.totalGoals ?? 0,
      };

      trends.matches = totals.matches - prevTotals.matches;
      trends.goals = totals.goals - prevTotals.goals;
    }

    res.json({
      totals,
      trends,
      topPerformers: {},
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// ============ NEW AGGREGATED STATS ENDPOINTS ============

/**
 * Get top scorers (Vua phá lưới) for a season
 */
router.get("/season/:seasonId/top-scorers", async (req, res, next) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    if (isNaN(seasonId)) {
      return res.status(400).json({ message: "Invalid season ID" });
    }
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const data = await getTopScorersBySeason(seasonId, limit);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * Get card statistics (Thẻ vàng/đỏ) for a season
 */
router.get("/season/:seasonId/cards", async (req, res, next) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    if (isNaN(seasonId)) {
      return res.status(400).json({ message: "Invalid season ID" });
    }
    const data = await getCardStatsBySeason(seasonId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * Get Man of the Match statistics for a season
 */
router.get("/season/:seasonId/man-of-match", async (req, res, next) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    if (isNaN(seasonId)) {
      return res.status(400).json({ message: "Invalid season ID" });
    }
    const data = await getMotmStatsBySeason(seasonId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * Get suspended players (Cầu thủ bị treo giò) for a season
 */
router.get("/season/:seasonId/suspended", async (req, res, next) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    if (isNaN(seasonId)) {
      return res.status(400).json({ message: "Invalid season ID" });
    }
    const data = await getSuspendedPlayers(seasonId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

/**
 * Get comprehensive stats overview for a season
 */
router.get("/season/:seasonId/overview", async (req, res, next) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    if (isNaN(seasonId)) {
      return res.status(400).json({ message: "Invalid season ID" });
    }
    const data = await getSeasonStatsOverview(seasonId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

export default router;
