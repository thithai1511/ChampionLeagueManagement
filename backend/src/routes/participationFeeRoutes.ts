import { Router, Request, Response } from "express";
import { requireAuth, requirePermission } from "../middleware/authMiddleware";
import * as participationFeeService from "../services/participationFeeService";

const router = Router();

/**
 * GET /api/participation-fees/season/:seasonId
 * Get all fees for a season (both paid and unpaid)
 */
router.get(
  "/season/:seasonId",
  requireAuth,
  requirePermission("view_season_statistics"),
  async (req: Request, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      // Get all fees (both paid and unpaid) for the season
      const allFees = await participationFeeService.getAllFeesForSeason(seasonId);
      res.json(allFees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fees" });
    }
  }
);

/**
 * GET /api/participation-fees/season/:seasonId/overdue
 * Get overdue fees for a season
 */
router.get(
  "/season/:seasonId/overdue",
  requireAuth,
  requirePermission("view_season_statistics"),
  async (req: Request, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      const overdueFees = await participationFeeService.getOverdueFees(seasonId);
      res.json(overdueFees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch overdue fees" });
    }
  }
);

/**
 * GET /api/participation-fees/season/:seasonId/statistics
 * Get fee payment statistics
 */
router.get(
  "/season/:seasonId/statistics",
  requireAuth,
  requirePermission("view_season_statistics"),
  async (req: Request, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      const stats = await participationFeeService.getFeePaymentStatistics(
        seasonId
      );
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fee statistics" });
    }
  }
);

/**
 * GET /api/participation-fees/team/:teamId/season/:seasonId
 * Get fee for specific team in season
 */
router.get(
  "/team/:teamId/season/:seasonId",
  async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId, 10);
      const seasonId = parseInt(req.params.seasonId, 10);
      const fee = await participationFeeService.getParticipationFee(
        seasonId,
        teamId
      );

      if (!fee) {
        return res.status(404).json({ error: "Fee record not found" });
      }

      res.json(fee);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team fee" });
    }
  }
);

/**
 * POST /api/participation-fees
 * Create participation fee
 */
router.post(
  "/",
  requireAuth,
  requirePermission("manage_season"),
  async (req: Request, res: Response) => {
    try {
      const { seasonId, teamId, feeAmount, dueDate, currency } = req.body;

      if (!seasonId || !teamId || !feeAmount || !dueDate) {
        return res.status(400).json({
          error:
            "Missing required fields: seasonId, teamId, feeAmount, dueDate",
        });
      }

      const fee = await participationFeeService.createParticipationFee(
        parseInt(seasonId, 10),
        parseInt(teamId, 10),
        parseInt(feeAmount, 10),
        dueDate,
        currency || "VND"
      );

      res.status(201).json(fee);
    } catch (error) {
      res.status(500).json({ error: "Failed to create fee" });
    }
  }
);

/**
 * POST /api/participation-fees/:feeId/mark-paid
 * Mark fee as paid
 */
router.post(
  "/:feeId/mark-paid",
  requireAuth,
  requirePermission("manage_payments"),
  async (req: Request, res: Response) => {
    try {
      const feeId = parseInt(req.params.feeId, 10);
      const { paymentMethod, paymentReference } = req.body;

      if (!paymentMethod || !paymentReference) {
        return res.status(400).json({
          error:
            "Missing required fields: paymentMethod, paymentReference",
        });
      }

      await participationFeeService.markFeeAsPaid(
        feeId,
        paymentMethod,
        paymentReference
      );
      res.json({ message: "Fee marked as paid" });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark fee as paid" });
    }
  }
);

/**
 * GET /api/participation-fees/team/:teamId/season/:seasonId/can-participate
 * Check if team can participate (fee paid)
 */
router.get(
  "/team/:teamId/season/:seasonId/can-participate",
  async (req: Request, res: Response) => {
    try {
      const teamId = parseInt(req.params.teamId, 10);
      const seasonId = parseInt(req.params.seasonId, 10);
      const result = await participationFeeService.canTeamParticipate(
        seasonId,
        teamId
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to check participation status" });
    }
  }
);

export default router;
