import { Router, Request, Response } from "express";
import { requireAuth, requirePermission } from "../middleware/authMiddleware";
import * as participationFeeService from "../services/participationFeeService";

const router = Router();

/**
 * GET /api/participation-fees/my (Get My Fee / Registration)
 * Query param: seasonId
 */
router.get(
  "/my",
  requireAuth,
  requirePermission("manage_team"),
  async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user.teamIds || req.user.teamIds.length === 0) {
        return res.status(400).json({ error: "User is not assigned to any team" });
      }

      const seasonId = parseInt(req.query.seasonId as string, 10);
      const teamId = Number(req.user.teamIds[0]); // Ensure number

      console.log(`[API] GET /my - seasonId: ${seasonId}, teamId: ${teamId}`); // Debug Log

      const fee = await participationFeeService.getMyFee(seasonId, teamId);

      if (!fee) return res.json(null);

      res.json(fee);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch my fee" });
    }
  }
);

/**
 * POST /api/participation-fees/:registrationId/submit
 * Submit fee with transaction code
 */
router.post(
  "/:registrationId/submit",
  requireAuth,
  requirePermission("manage_team"),
  async (req: Request, res: Response) => {
    try {
      const registrationId = parseInt(req.params.registrationId, 10);
      const { transaction_code, team_note, evidence_url } = req.body;

      // Security: Validate ownership inside service, but we need teamId here
      if (!req.user || !req.user.teamIds || req.user.teamIds.length === 0) {
        return res.status(403).json({ error: "Not authorized as team admin" });
      }
      const teamId = req.user.teamIds[0];

      if (!transaction_code) {
        return res.status(400).json({ error: "Transaction code is required (snake_case: transaction_code)" });
      }

      await participationFeeService.submitFee(
        registrationId,
        teamId,
        transaction_code,
        team_note || "",
        evidence_url
      );

      res.json({ message: "Fee submitted successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to submit fee" });
    }
  }
);

/**
 * POST /api/participation-fees/:registrationId/approve
 * Admin approve
 */
router.post(
  "/:registrationId/approve",
  requireAuth,
  requirePermission("manage_payments"),
  async (req: Request, res: Response) => {
    try {
      const registrationId = parseInt(req.params.registrationId, 10);
      const adminId = (req.user as any)?.userId;

      await participationFeeService.approveFee(registrationId, adminId);
      res.json({ message: "Fee approved" });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to approve fee" });
    }
  }
);

/**
 * POST /api/participation-fees/:registrationId/reject
 * Admin reject
 */
router.post(
  "/:registrationId/reject",
  requireAuth,
  requirePermission("manage_payments"),
  async (req: Request, res: Response) => {
    try {
      const registrationId = parseInt(req.params.registrationId, 10);
      const { reason } = req.body;
      const adminId = (req.user as any)?.userId;

      if (!reason) return res.status(400).json({ error: "Rejection reason is required" });

      await participationFeeService.rejectFee(registrationId, adminId, reason);
      res.json({ message: "Fee rejected" });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to reject fee" });
    }
  }
);

export default router;
