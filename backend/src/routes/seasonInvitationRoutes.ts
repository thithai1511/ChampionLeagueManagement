import { Router, Request, Response } from "express";
import { requireAuth, requireAnyPermission } from "../middleware/authMiddleware";
import * as invitationService from "../services/seasonInvitationService";
import { query } from "../db/sqlServer";
import { AuthenticatedRequest } from "../types";

const router = Router();
const requireTeamManagement = requireAnyPermission("manage_teams", "manage_rulesets");

/**
 * GET /api/seasons/:seasonId/invitations
 * List all invitations for a season
 */
router.get(
  "/:seasonId/invitations",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      if (isNaN(seasonId)) {
        return res.status(400).json({ error: "Invalid season ID" });
      }
      const invitations = await invitationService.getSeasonInvitations(seasonId);
      // Transform to match frontend expected format
      const transformed = invitations.map(inv => ({
        invitationId: inv.invitation_id,
        seasonId: inv.season_id,
        teamId: inv.team_id,
        teamName: inv.team_name,
        shortName: null,
        inviteType: 'retained', // Default, would need to check database
        status: inv.response_status,
        invitedAt: inv.sent_at,
        responseDeadline: inv.deadline,
        respondedAt: inv.response_date,
        responseNotes: inv.response_notes
      }));
      res.json({ data: transformed });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to list invitations" });
    }
  }
);

/**
 * GET /api/seasons/:seasonId/invitations/stats
 * Get invitation statistics
 */
router.get(
  "/:seasonId/invitations/stats",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      if (isNaN(seasonId)) {
        return res.status(400).json({ error: "Invalid season ID" });
      }
      
      const summary = await invitationService.getInvitationsSummary(seasonId);
      
      // Get accepted count
      const acceptedResult = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM season_invitations WHERE season_id = @seasonId AND response_status = 'accepted'`,
        { seasonId }
      );
      const acceptedCount = acceptedResult.recordset[0]?.count || 0;
      
      res.json({
        data: {
          acceptedCount,
          totalPending: summary.pending,
          totalDeclined: summary.rejected,
          totalExpired: summary.expired,
          totalReplaced: 0, // Would need to check replacement_for_id
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get invitation statistics" });
    }
  }
);

/**
 * POST /api/seasons/:seasonId/invitations
 * Create a single invitation (stub - needs implementation)
 */
router.post(
  "/:seasonId/invitations",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    res.status(501).json({ error: "Not implemented yet" });
  }
);

/**
 * POST /api/seasons/:seasonId/invitations/auto-create
 * Automatically create invitations (uses existing service)
 */
router.post(
  "/:seasonId/invitations/auto-create",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      if (isNaN(seasonId)) {
        return res.status(400).json({ error: "Invalid season ID" });
      }
      const userId = req.user!.sub;
      await invitationService.createSeasonInvitations(seasonId, userId);
      res.status(201).json({ data: { message: "Invitations created successfully" } });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to auto-create invitations" });
    }
  }
);

/**
 * GET /api/seasons/:seasonId/invitations/:invitationId/eligibility
 * Check team eligibility (stub - needs implementation)
 */
router.get(
  "/:seasonId/invitations/:invitationId/eligibility",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    res.status(501).json({ error: "Not implemented yet" });
  }
);

/**
 * PATCH /api/seasons/:seasonId/invitations/:invitationId/status
 * Update invitation status
 */
router.patch(
  "/:seasonId/invitations/:invitationId/status",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const invitationId = parseInt(req.params.invitationId, 10);
      const { status, responseNotes } = req.body;
      
      if (status === 'accepted') {
        await invitationService.acceptInvitation(invitationId, responseNotes);
      } else if (status === 'declined') {
        await invitationService.rejectInvitation(invitationId, responseNotes);
      } else {
        return res.status(400).json({ error: "Invalid status. Use 'accepted' or 'declined'" });
      }
      
      res.json({ message: "Invitation status updated successfully" });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update invitation status" });
    }
  }
);

/**
 * POST /api/seasons/:seasonId/invitations/:invitationId/create-replacement
 * Create replacement invitation (stub - needs implementation)
 */
router.post(
  "/:seasonId/invitations/:invitationId/create-replacement",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    res.status(501).json({ error: "Not implemented yet" });
  }
);

/**
 * POST /api/seasons/:seasonId/invitations/ensure-minimum-teams
 * Ensure minimum teams (stub - needs implementation)
 */
router.post(
  "/:seasonId/invitations/ensure-minimum-teams",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    res.status(501).json({ error: "Not implemented yet" });
  }
);

export default router;