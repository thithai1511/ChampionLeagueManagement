import { Router, Request, Response } from "express";
import { requireAuth, requirePermission } from "../middleware/authMiddleware";
import * as matchOfficialService from "../services/matchOfficialService";
import { query } from "../db/sqlServer";

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

/**
 * GET /api/match-officials/my-reports
 * Get all match reports submitted by the current user (referee/official)
 */
router.get(
  "/my-reports",
  requireAuth,
  async (req: any, res: Response) => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get reports submitted by this user
      // Try both schema versions: old (reported_by_user_id) and new (reporting_official_id)
      let reportsResult;
      
      try {
        // First, try to get official_id for this user
        const officialCheck = await query<{ official_id: number }>(
          `SELECT official_id FROM officials WHERE user_id = @userId AND status = 'active'`,
          { userId }
        );
        
        const officialId = officialCheck.recordset?.[0]?.official_id;
        
        // Use actual database schema columns (from 20250205_full_system_schema.sql)
        // Columns: match_report_id, match_id, season_id, reporting_official_id, submitted_at,
        //          home_score, away_score, player_of_match_id, weather, attendance, additional_notes
        if (officialId) {
          reportsResult = await query<{
            id: number;
            match_id: number;
            home_team_name: string;
            away_team_name: string;
            match_date: string;
            weather: string | null;
            attendance: number | null;
            notes: string | null;
            submitted_at: string;
          }>(
            `
            SELECT 
              mr.match_report_id AS id,
              mr.match_id,
              CONVERT(VARCHAR(33), m.scheduled_kickoff, 127) AS match_date,
              mr.weather,
              mr.attendance,
              mr.additional_notes AS notes,
              CONVERT(VARCHAR(23), mr.submitted_at, 126) AS submitted_at,
              ht.name AS home_team_name,
              at.name AS away_team_name
            FROM match_reports mr
            INNER JOIN matches m ON mr.match_id = m.match_id
            INNER JOIN season_team_participants hstp ON m.home_season_team_id = hstp.season_team_id
            INNER JOIN teams ht ON hstp.team_id = ht.team_id
            INNER JOIN season_team_participants astp ON m.away_season_team_id = astp.season_team_id
            INNER JOIN teams at ON astp.team_id = at.team_id
            WHERE mr.reporting_official_id = @officialId
            ORDER BY mr.submitted_at DESC
            `,
            { officialId }
          );
        } else {
          // No official record - return empty array (user not yet linked to an official)
          reportsResult = { recordset: [] };
        }
      } catch (schemaError: any) {
        // If all queries fail, return empty array
        console.error('Error querying reports:', schemaError);
        console.error('Error details:', {
          message: schemaError.message,
          code: schemaError.code,
          number: schemaError.number
        });
        return res.json({ data: [] });
      }

      res.json({ data: reportsResult.recordset || [] });
    } catch (error: any) {
      console.error("Get my reports error:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        number: error.number,
        originalError: error.originalError
      });
      
      // Return empty array instead of error if it's a schema/table issue
      if (error.message?.includes('Invalid object name') || 
          error.message?.includes('Invalid column name') ||
          error.number === 208) {
        console.log('Table or column not found, returning empty array');
        return res.json({ data: [] });
      }
      
      res.status(500).json({ 
        error: "Failed to fetch reports",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/match-officials/my-assignments
 * Get all matches assigned to the current user (referee/official)
 */
router.get(
  "/my-assignments",
  requireAuth,
  async (req: any, res: Response) => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get official_id from user_id (officials table has user_id column)
      const officialResult = await query<{ official_id: number }>(
        `SELECT official_id FROM officials WHERE user_id = @userId AND status = 'active'`,
        { userId }
      );

      if (!officialResult.recordset || officialResult.recordset.length === 0) {
        // No official record found for this user - return empty array
        // This is normal if user hasn't been assigned as an official yet
        console.log(`No official record found for user ${userId}`);
        return res.json({ data: [] });
      }

      const officialId = officialResult.recordset[0].official_id;

      // Get all matches assigned to this official
      const matchesResult = await query<{
        match_id: number;
        scheduled_kickoff: string;
        status: string;
        home_team_name: string;
        away_team_name: string;
        home_score: number | null;
        away_score: number | null;
        venue: string | null;
        role: string;
      }>(
        `
        SELECT 
          m.match_id,
          CONVERT(VARCHAR(33), m.scheduled_kickoff, 127) AS scheduled_kickoff,
          m.status,
          ht.name AS home_team_name,
          at.name AS away_team_name,
          m.home_score,
          m.away_score,
          s.name AS venue,
          moa.role_code AS role
        FROM match_official_assignments moa
        INNER JOIN matches m ON moa.match_id = m.match_id
        INNER JOIN season_team_participants hstp ON m.home_season_team_id = hstp.season_team_id
        INNER JOIN teams ht ON hstp.team_id = ht.team_id
        INNER JOIN season_team_participants astp ON m.away_season_team_id = astp.season_team_id
        INNER JOIN teams at ON astp.team_id = at.team_id
        LEFT JOIN stadiums s ON m.stadium_id = s.stadium_id
        WHERE moa.official_id = @officialId
        ORDER BY m.scheduled_kickoff DESC
        `,
        { officialId }
      );

      res.json({ data: matchesResult.recordset || [] });
    } catch (error: any) {
      console.error("Get my assignments error:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  }
);

export default router;
