import { Router, Request, Response } from "express";
import { requireAuth, requirePermission } from "../middleware/authMiddleware";
import * as scheduleService from "../services/scheduleService";

const router = Router();
 
/**
 * POST /api/schedule/generate
 * Generate round-robin schedule for a season
 */
router.post(
  "/generate",
  requireAuth,
  requirePermission("manage_schedule"),
  async (req: Request, res: Response) => {
    try {
      const { seasonId, startDate } = req.body;

      if (!seasonId || !startDate) {
        return res.status(400).json({
          error: "Missing required fields: seasonId, startDate",
        });
      }

      const matches = await scheduleService.generateRoundRobinSchedule(
        parseInt(seasonId, 10),
        startDate
      );

      res.status(201).json({
        message: "Schedule generated successfully",
        matchCount: matches.length,
        matches,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate schedule" });
    }
  }
);

/**
 * GET /api/schedule/season/:seasonId
 * Get full schedule for a season
 */
router.get("/season/:seasonId", async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    const schedule = await scheduleService.getSchedule(seasonId);
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

/**
 * GET /api/schedule/season/:seasonId/round/:round
 * Get matches for a specific round
 */
router.get(
  "/season/:seasonId/round/:round",
  async (req: Request, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      const round = parseInt(req.params.round, 10);
      const matches = await scheduleService.getMatchesByRound(seasonId, round);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch round matches" });
    }
  }
);

/**
 * GET /api/schedule/tiebreaker/:seasonId
 * Get tiebreaker standings for teams with equal points
 */
router.get("/tiebreaker/:seasonId", async (req: Request, res: Response) => {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    const { teamIds } = req.query;

    if (!teamIds) {
      return res.status(400).json({
        error: "Missing required query parameter: teamIds (comma-separated)",
      });
    }

    const teamIdArray = (teamIds as string)
      .split(",")
      .map((id) => parseInt(id, 10));
    const tiebreaker = await scheduleService.calculateTiebreaker(
      seasonId,
      teamIdArray
    );

    res.json(tiebreaker);
  } catch (error) {
    res.status(500).json({ error: "Failed to calculate tiebreaker" });
  }
});

export default router;
