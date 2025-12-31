import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import * as playerStatsDisplayService from "../services/playerStatsDisplayService";

const router = Router();
 
/**
 * GET /api/player-stats/season/:seasonId
 * Get player statistics for a season
 */
router.get("/season/:seasonId", async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    const stats = await playerStatsDisplayService.getPlayerStatistics(seasonId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch player statistics" });
  }
});

/**
 * GET /api/player-stats/season/:seasonId/player/:playerId
 * Get statistics for specific player in season
 */
router.get(
  "/season/:seasonId/player/:playerId",
  async (req: Request, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      const playerId = parseInt(req.params.playerId, 10);
      const stats = await playerStatsDisplayService.getPlayerStatistics(
        seasonId,
        playerId
      );

      if (stats.length === 0) {
        return res.status(404).json({ error: "Player statistics not found" });
      }

      res.json(stats[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch player statistics" });
    }
  }
);

/**
 * GET /api/player-stats/player/:playerId/physical
 * Get player physical statistics
 */
router.get("/player/:playerId/physical", async (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.params.playerId, 10);
    const stats = await playerStatsDisplayService.getPlayerPhysicalStats(
      playerId
    );
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch physical stats" });
  }
});

/**
 * GET /api/player-stats/season/:seasonId/top-scorers
 * Get top scorers in a season
 */
router.get("/season/:seasonId/top-scorers", async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const topScorers = await playerStatsDisplayService.getTopScorers(
      seasonId,
      limit
    );
    res.json(topScorers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch top scorers" });
  }
});

/**
 * GET /api/player-stats/season/:seasonId/assists-leaders
 * Get assists leaders in a season
 */
router.get(
  "/season/:seasonId/assists-leaders",
  async (req: Request, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const leaders = await playerStatsDisplayService.getAssistsLeaders(
        seasonId,
        limit
      );
      res.json(leaders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assists leaders" });
    }
  }
);

/**
 * GET /api/player-stats/height/:minHeight/:maxHeight
 * Get players by height range
 */
router.get(
  "/height/:minHeight/:maxHeight",
  async (req: Request, res: Response) => {
    try {
      const minHeight = parseInt(req.params.minHeight, 10);
      const maxHeight = parseInt(req.params.maxHeight, 10);
      const players = await playerStatsDisplayService.getPlayersByHeightRange(
        minHeight,
        maxHeight
      );
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch players by height" });
    }
  }
);

/**
 * GET /api/player-stats/weight/:minWeight/:maxWeight
 * Get players by weight range
 */
router.get(
  "/weight/:minWeight/:maxWeight",
  async (req: Request, res: Response) => {
    try {
      const minWeight = parseInt(req.params.minWeight, 10);
      const maxWeight = parseInt(req.params.maxWeight, 10);
      const players = await playerStatsDisplayService.getPlayersByWeightRange(
        minWeight,
        maxWeight
      );
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch players by weight" });
    }
  }
);

/**
 * GET /api/player-stats/team/:teamId/physical-averages
 * Get average physical stats for a team
 */
router.get(
  "/team/:teamId/physical-averages",
  async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId, 10);
      const averages =
        await playerStatsDisplayService.getTeamPhysicalAverages(teamId);
      res.json(averages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team physical averages" });
    }
  }
);

export default router;
