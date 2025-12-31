import { Router, Request, Response } from "express";
import { requireAuth, requirePermission } from "../middleware/authMiddleware";
import * as matchOfficialService from "../services/matchOfficialService";

const router = Router();

/**
 * GET /api/match-officials/match/:matchId
 * Get all officials assigned to a match
 */
router.get("/match/:matchId", async (req: Request, res: Response) => {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    const officials = await matchOfficialService.getMatchOfficials(matchId);
    res.json(officials);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch match officials" });
  }
});

/**
 * GET /api/match-officials/official/:officialId
 * Get all assignments for an official
 */
router.get("/official/:officialId", async (req: Request, res: Response) => {
  try {
    const officialId = parseInt(req.params.officialId, 10);
    const assignments = await matchOfficialService.getOfficialAssignments(
      officialId
    );
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch official assignments" });
  }
});

/**
 * GET /api/match-officials/available/:matchId
 * Get available officials for a match
 */
router.get("/available/:matchId", async (req: Request, res: Response) => {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    const officials = await matchOfficialService.getAvailableOfficials(matchId);
    res.json(officials);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch available officials" });
  }
});

/**
 * GET /api/match-officials/pending
 * Get pending confirmations (Admin only)
 */
router.get(
  "/pending",
  requireAuth,
  requirePermission("manage_match_officials"),
  async (req: Request, res: Response) => {
    try {
      const pending = await matchOfficialService.getPendingConfirmations();
      res.json(pending);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending confirmations" });
    }
  }
);

/**
 * POST /api/match-officials/assign
 * Assign official to match (Admin only)
 */
router.post(
  "/assign",
  requireAuth,
  requirePermission("manage_match_officials"),
  async (req: Request, res: Response) => {
    try {
      const { matchId, officialId, role } = req.body;

      if (!matchId || !officialId || !role) {
        return res.status(400).json({
          error: "Missing required fields: matchId, officialId, role",
        });
      }

      const validRoles = [
        "referee",
        "assistant_referee",
        "fourth_official",
        "video_assistant_referee",
      ];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const official = await matchOfficialService.assignOfficialToMatch(
        parseInt(matchId, 10),
        parseInt(officialId, 10),
        role,
        userId
      );

      res.status(201).json(official);
    } catch (error) {
      res.status(500).json({ error: "Failed to assign official" });
    }
  }
);

/**
 * POST /api/match-officials/batch-assign
 * Batch assign multiple officials to a match
 */
router.post(
  "/batch-assign",
  requireAuth,
  requirePermission("manage_match_officials"),
  async (req: Request, res: Response) => {
    try {
      const { matchId, assignments } = req.body;

      if (!matchId || !Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({
          error:
            "Missing required fields: matchId, assignments (array of {officialId, role})",
        });
      }

      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const results = await matchOfficialService.batchAssignOfficials(
        parseInt(matchId, 10),
        assignments,
        userId
      );

      res.status(201).json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to batch assign officials" });
    }
  }
);

/**
 * POST /api/match-officials/:assignmentId/confirm
 * Confirm assignment
 */
router.post(
  "/:assignmentId/confirm",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId, 10);
      const { notes } = req.body;

      await matchOfficialService.confirmAssignment(assignmentId, notes);
      res.json({ message: "Assignment confirmed successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to confirm assignment" });
    }
  }
);

/**
 * PUT /api/match-officials/:assignmentId/role
 * Update assignment role
 */
router.put(
  "/:assignmentId/role",
  requireAuth,
  requirePermission("manage_match_officials"),
  async (req: Request, res: Response) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId, 10);
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ error: "Role is required" });
      }

      const validRoles = [
        "referee",
        "assistant_referee",
        "fourth_official",
        "video_assistant_referee",
      ];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      await matchOfficialService.updateAssignmentRole(
        assignmentId,
        role
      );
      res.json({ message: "Role updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update role" });
    }
  }
);

/**
 * DELETE /api/match-officials/:assignmentId
 * Cancel assignment
 */
router.delete(
  "/:assignmentId",
  requireAuth,
  requirePermission("manage_match_officials"),
  async (req: Request, res: Response) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId, 10);
      await matchOfficialService.cancelAssignment(assignmentId);
      res.json({ message: "Assignment cancelled successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel assignment" });
    }
  }
);

/**
 * POST /api/match-officials/match/:matchId/auto-assign
 * Auto assign officials to a match (Super Admin only)
 */
router.post(
  "/match/:matchId/auto-assign",
  requireAuth,
  requirePermission("manage_match_officials"),
  async (req: any, res: Response) => {
    try {
      const matchId = parseInt(req.params.matchId, 10);
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Check if user is super admin
      const isSuperAdmin = Array.isArray(req.user?.roles) && req.user.roles.includes("super_admin");
      if (!isSuperAdmin) {
        return res.status(403).json({ error: "Only super admin can auto assign officials" });
      }

      const result = await matchOfficialService.autoAssignOfficials(matchId, userId);
      
      res.json({
        success: true,
        message: `Đã phân công ${result.assigned.length} trọng tài`,
        data: result
      });
    } catch (error: any) {
      console.error("Auto assign officials error:", error);
      res.status(500).json({ error: error.message || "Failed to auto assign officials" });
    }
  }
);

export default router;
