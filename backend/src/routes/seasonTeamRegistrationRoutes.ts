/**
 * Season Team Registration Routes
 * 
 * Routes for team registration workflow management
 */

import { Router, Response } from "express";
import { requireAuth, requirePermission, requireAnyPermission } from "../middleware/authMiddleware";
import * as controller from "../controllers/seasonRegistrationController";
import { AuthenticatedRequest } from "../types";
import { query } from "../db/sqlServer";

const router = Router();

// ============================================================
// TEAM ADMIN - PENDING INVITATIONS COUNT
// ============================================================

/**
 * GET /api/invitations/my-pending-count
 * Get count of pending invitations for current user's teams
 */
router.get(
  "/invitations/my-pending-count",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userTeamIds = req.user?.teamIds || [];
      
      if (userTeamIds.length === 0) {
        return res.json({ count: 0 });
      }
      
      const teamIdPlaceholders = userTeamIds.map((_, i) => `@teamId${i}`).join(',');
      const params: Record<string, any> = {};
      userTeamIds.forEach((id, i) => {
        params[`teamId${i}`] = id;
      });
      
      const result = await query<{ count: number }>(
        `SELECT COUNT(*) as count 
         FROM season_team_registrations 
         WHERE team_id IN (${teamIdPlaceholders}) 
         AND registration_status = 'INVITED'`,
        params
      );
      
      const count = result.recordset[0]?.count || 0;
      console.log(`[GET my-pending-count] user=${req.user?.sub}, teams=${userTeamIds}, count=${count}`);
      
      res.json({ count });
    } catch (error: any) {
      console.error('[GET my-pending-count] Error:', error);
      res.status(500).json({ error: "Failed to get pending invitation count" });
    }
  }
);

// ============================================================
// ADMIN ROUTES - Season Registration Management
// ============================================================

/**
 * GET /api/seasons/:seasonId/registrations
 * List all registrations for a season
 * Query params: ?status=INVITED (optional)
 */
router.get(
  "/seasons/:seasonId/registrations",
  requireAuth,
  requirePermission("manage_seasons"),
  controller.listRegistrations
);

/**
 * POST /api/seasons/:seasonId/registrations
 * Create new registration (usually from invitation)
 */
router.post(
  "/seasons/:seasonId/registrations",
  requireAuth,
  requirePermission("manage_seasons"),
  controller.createRegistration
);

/**
 * GET /api/seasons/:seasonId/registrations/statistics
 * Get registration statistics
 */
router.get(
  "/seasons/:seasonId/registrations/statistics",
  requireAuth,
  requirePermission("manage_seasons"),
  controller.getStatistics
);

/**
 * POST /api/seasons/:seasonId/registrations/send-invitations
 * Batch send all draft invitations (DRAFT_INVITE -> INVITED)
 */
router.post(
  "/seasons/:seasonId/registrations/send-invitations",
  requireAuth,
  requirePermission("manage_seasons"),
  controller.sendAllInvitations
);

/**
 * POST /api/seasons/:seasonId/invitations/generate-suggested
 * Generate draft invitations for all eligible teams
 */
router.post(
  "/seasons/:seasonId/invitations/generate-suggested",
  requireAuth,
  requirePermission("manage_seasons"),
  controller.generateSuggestedInvitations
);

// ============================================================
// INVITATION ALIAS ROUTES (Frontend uses /invitations, backend uses /registrations)
// ============================================================

/**
 * GET /api/seasons/:seasonId/invitations
 * List all invitations for a season (alias for registrations)
 */
router.get(
  "/seasons/:seasonId/invitations",
  requireAuth,
  requirePermission("manage_seasons"),
  controller.listRegistrations
);

/**
 * GET /api/seasons/:seasonId/invitations/stats
 * Get invitation statistics
 */
router.get(
  "/seasons/:seasonId/invitations/stats",
  requireAuth,
  requirePermission("manage_seasons"),
  controller.getStatistics
);

/**
 * POST /api/seasons/:seasonId/invitations
 * Create new invitation
 */
router.post(
  "/seasons/:seasonId/invitations",
  requireAuth,
  requirePermission("manage_seasons"),
  controller.createInvitation
);

/**
 * POST /api/seasons/:seasonId/invitations/send-all
 * Batch send all draft invitations
 */
router.post(
  "/seasons/:seasonId/invitations/send-all",
  requireAuth,
  requirePermission("manage_seasons"),
  controller.sendAllInvitations
);

/**
 * PATCH /api/seasons/:seasonId/invitations/:invitationId
 * Update invitation (deadline, etc.)
 */
router.patch(
  "/seasons/:seasonId/invitations/:invitationId",
  requireAuth,
  requirePermission("manage_seasons"),
  controller.updateInvitation
);

/**
 * PATCH /api/seasons/:seasonId/invitations/:invitationId/status
 * Update invitation status
 */
router.patch(
  "/seasons/:seasonId/invitations/:invitationId/status",
  requireAuth,
  requirePermission("manage_seasons"),
  controller.updateInvitationStatus
);

/**
 * DELETE /api/seasons/:seasonId/invitations/:invitationId
 * Delete invitation
 */
router.delete(
  "/seasons/:seasonId/invitations/:invitationId",
  requireAuth,
  requirePermission("manage_seasons"),
  controller.deleteInvitation
);

// ============================================================
// REGISTRATION DETAIL ROUTES
// ============================================================

/**
 * GET /api/registrations/:registrationId
 * Get registration details
 */
router.get(
  "/registrations/:registrationId",
  requireAuth,
  controller.getRegistration
);

/**
 * POST /api/registrations/:registrationId/change-status
 * Change registration status (one-stop API)
 * Body: { status, note?, submissionData? }
 */
router.post(
  "/registrations/:registrationId/change-status",
  requireAuth,
  requireAnyPermission("manage_seasons", "manage_teams"),
  controller.changeStatus
);

// ============================================================
// TEAM ROUTES - Team Actions
// ============================================================

/**
 * POST /api/registrations/:registrationId/accept
 * Team accepts invitation
 */
router.post(
  "/registrations/:registrationId/accept",
  requireAuth,
  requireAnyPermission("manage_teams", "manage_own_team", "manage_own_team_squad", "view_own_team"),
  controller.acceptInvitation
);

/**
 * POST /api/registrations/:registrationId/decline
 * Team declines invitation
 */
router.post(
  "/registrations/:registrationId/decline",
  requireAuth,
  requireAnyPermission("manage_teams", "manage_own_team", "manage_own_team_squad", "view_own_team"),
  controller.declineInvitation
);

/**
 * POST /api/registrations/:registrationId/submit
 * Team submits registration documents
 * Body: { submissionData: { stadium, kits, players, documents } }
 */
router.post(
  "/registrations/:registrationId/submit",
  requireAuth,
  requireAnyPermission("manage_teams", "manage_own_team", "manage_own_team_squad", "view_own_team"),
  controller.submitDocuments
);

/**
 * GET /api/teams/:teamId/registrations
 * Get all registrations for a team
 */
router.get(
  "/teams/:teamId/registrations",
  requireAuth,
  controller.getTeamRegistrations
);

// ============================================================
// ADMIN ROUTES - BTC Review Actions
// ============================================================

/**
 * POST /api/registrations/:registrationId/approve
 * BTC approves registration
 */
router.post(
  "/registrations/:registrationId/approve",
  requireAuth,
  requirePermission("manage_seasons"),
  controller.approveRegistration
);

/**
 * POST /api/registrations/:registrationId/reject
 * BTC rejects registration
 * Body: { note: "rejection reason" }
 */
router.post(
  "/registrations/:registrationId/reject",
  requireAuth,
  requirePermission("manage_seasons"),
  controller.rejectRegistration
);

/**
 * POST /api/registrations/:registrationId/request-change
 * BTC requests changes to submission
 * Body: { note: "change request reason" }
 */
router.post(
  "/registrations/:registrationId/request-change",
  requireAuth,
  requirePermission("manage_seasons"),
  controller.requestChange
);

export default router;
