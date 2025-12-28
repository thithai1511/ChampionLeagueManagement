import { Router, Request, Response } from "express";
import { requireAuth, requireAnyPermission } from "../middleware/authMiddleware";
import * as invitationService from "../services/seasonInvitationService";
import { query } from "../db/sqlServer";
import { AuthenticatedRequest } from "../types";

const router = Router();
const requireTeamManagement = requireAnyPermission("manage_teams", "manage_rulesets");

/**
 * GET /api/invitations/my-pending-count
 * Get count of pending invitations for current user's teams
 */
router.get(
  "/my-pending-count",
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
         FROM season_invitations 
         WHERE team_id IN (${teamIdPlaceholders}) 
         AND status IN ('pending', 'sent')`,
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

// Status labels for frontend - matches DB constraint
const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ phản hồi',
  accepted: 'Đã chấp nhận',
  declined: 'Đã từ chối',
  expired: 'Hết hạn',
  rescinded: 'Đã thu hồi',
  replaced: 'Đã thay thế'
};

const INVITE_TYPE_LABELS: Record<string, string> = {
  retained: 'Top 8 mùa trước',
  promoted: 'Thăng hạng',
  replacement: 'Thay thế / Thủ công'
};

/**
 * GET /api/seasons/:seasonId/invitations
 * List all invitations for a season
 * - Super admin / manage_teams: see all invitations
 * - Team admin: only see invitations for their teams
 */
router.get(
  "/:seasonId/invitations",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      if (isNaN(seasonId)) {
        return res.status(400).json({ error: "Invalid season ID" });
      }
      
      // Check if user has team management permissions (see all)
      const hasManageTeams = req.user?.permissions?.includes('manage_teams');
      const isSuperAdmin = req.user?.roles?.includes('super_admin');
      const canSeeAll = hasManageTeams || isSuperAdmin;
      
      // Get user's team IDs if not admin
      const userTeamIds = req.user?.teamIds;
      
      let invitations = await invitationService.getSeasonInvitations(seasonId);
      
      // Filter by team if user is team admin
      if (!canSeeAll && Array.isArray(userTeamIds) && userTeamIds.length > 0) {
        console.log(`[GET invitations] Filtering for team admin, teamIds:`, userTeamIds);
        invitations = invitations.filter(inv => userTeamIds.includes(inv.team_id));
      } else if (!canSeeAll) {
        // User has no teams and is not admin - return empty
        console.log(`[GET invitations] User has no teams and is not admin, returning empty`);
        return res.json({ data: [] });
      }
      
      console.log(`[GET invitations] Returning ${invitations.length} invitations`);
      
      // Transform to match frontend expected format
      const transformed = invitations.map(inv => ({
        invitationId: inv.invitation_id,
        seasonId: inv.season_id,
        teamId: inv.team_id,
        teamName: inv.team_name,
        shortName: inv.short_name,
        teamLogo: inv.team_logo,
        inviteType: inv.invite_type || 'replacement',
        inviteTypeLabel: INVITE_TYPE_LABELS[inv.invite_type] || inv.invite_type,
        status: inv.response_status,
        statusLabel: STATUS_LABELS[inv.response_status] || inv.response_status,
        invitedAt: inv.sent_at,
        responseDeadline: inv.deadline,
        respondedAt: inv.response_date,
        responseNotes: inv.response_notes,
        docsStatus: inv.docs_status,
        replacementForId: inv.replacement_for_id
      }));
      res.json({ data: transformed });
    } catch (error: any) {
      console.error('[GET invitations] Error:', error);
      res.status(500).json({ error: "Failed to list invitations" });
    }
  }
);

/**
 * GET /api/seasons/:seasonId/invitations/stats
 * Get invitation statistics with detailed breakdown
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
      
      // Get detailed counts by status
      const statsResult = await query<{
        status: string;
        count: number;
      }>(
        `SELECT response_status as status, COUNT(*) as count 
         FROM season_invitations 
         WHERE season_id = @seasonId 
         GROUP BY response_status`,
        { seasonId }
      );
      
      const statusCounts: Record<string, number> = {};
      for (const row of statsResult.recordset) {
        statusCounts[row.status] = row.count;
      }
      
      const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
      const qualified = statusCounts['qualified'] || 0;
      
      res.json({
        data: {
          total,
          draft: statusCounts['draft'] || 0,
          sent: (statusCounts['sent'] || 0) + (statusCounts['pending'] || 0),
          acceptedCount: statusCounts['accepted'] || 0,
          totalPending: (statusCounts['sent'] || 0) + (statusCounts['pending'] || 0),
          totalDeclined: statusCounts['rejected'] || 0,
          totalExpired: statusCounts['expired'] || 0,
          awaitingSubmission: statusCounts['awaiting_submission'] || 0,
          submitted: statusCounts['submitted'] || 0,
          qualified,
          disqualified: statusCounts['disqualified'] || 0,
          totalReplaced: statusCounts['replaced'] || 0,
          targetTeams: 10,
          isComplete: qualified >= 10,
          progress: Math.min(100, (qualified / 10) * 100)
        },
      });
    } catch (error: any) {
      console.error('[GET invitations/stats]', error);
      res.status(500).json({ error: "Failed to get invitation statistics" });
    }
  }
);

/**
 * POST /api/seasons/:seasonId/invitations
 * Add a single team to invitation list
 */
router.post(
  "/:seasonId/invitations",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      if (isNaN(seasonId)) {
        return res.status(400).json({ error: "Invalid season ID" });
      }
      const { teamId, inviteType } = req.body;
      if (!teamId) {
        return res.status(400).json({ error: "teamId is required" });
      }
      const userId = req.user!.sub;
      const invitationId = await invitationService.addTeamToInvitations(
        seasonId, 
        teamId, 
        userId, 
        inviteType || 'manual'
      );
      res.status(201).json({ data: { invitationId, message: "Invitation created successfully" } });
    } catch (error: any) {
      console.error('[POST invitation]', error);
      res.status(400).json({ error: error.message || "Failed to create invitation" });
    }
  }
);

/**
 * DELETE /api/seasons/:seasonId/invitations/:invitationId
 * Remove a draft invitation
 */
router.delete(
  "/:seasonId/invitations/:invitationId",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const invitationId = parseInt(req.params.invitationId, 10);
      if (isNaN(invitationId)) {
        return res.status(400).json({ error: "Invalid invitation ID" });
      }
      console.log(`[DELETE invitation] invitationId=${invitationId}, user=${req.user?.sub}`);
      const deleted = await invitationService.removeInvitation(invitationId);
      if (!deleted) {
        return res.status(400).json({ error: "Chỉ có thể xóa lời mời ở trạng thái 'Chưa gửi' hoặc 'Chờ phản hồi'" });
      }
      console.log(`[DELETE invitation] Success: deleted invitation ${invitationId}`);
      res.status(204).send();
    } catch (error: any) {
      console.error('[DELETE invitation] Error:', error);
      res.status(500).json({ error: "Failed to delete invitation" });
    }
  }
);

/**
 * PATCH /api/seasons/:seasonId/invitations/:invitationId
 * Update invitation (deadline)
 */
router.patch(
  "/:seasonId/invitations/:invitationId",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const invitationId = parseInt(req.params.invitationId, 10);
      const { deadlineDays } = req.body;
      
      if (isNaN(invitationId)) {
        return res.status(400).json({ error: "Invalid invitation ID" });
      }
      if (!deadlineDays || deadlineDays < 1) {
        return res.status(400).json({ error: "deadlineDays must be at least 1" });
      }
      
      console.log(`[PATCH invitation] invitationId=${invitationId}, deadlineDays=${deadlineDays}, user=${req.user?.sub}`);
      
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + deadlineDays);
      
      await query(
        `UPDATE season_invitations 
         SET response_deadline = @deadline 
         WHERE invitation_id = @invitationId`,
        { invitationId, deadline: deadline.toISOString() }
      );
      
      console.log(`[PATCH invitation] Success: updated invitation ${invitationId} deadline`);
      res.json({ message: "Invitation updated successfully" });
    } catch (error: any) {
      console.error('[PATCH invitation] Error:', error);
      res.status(500).json({ error: "Failed to update invitation" });
    }
  }
);

/**
 * POST /api/seasons/:seasonId/invitations/generate-suggested
 * Generate suggested invitation list (Phase 1)
 */
router.post(
  "/:seasonId/invitations/generate-suggested",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      if (isNaN(seasonId)) {
        return res.status(400).json({ error: "Invalid season ID" });
      }
      const userId = req.user!.sub;
      console.log(`[POST generate-suggested] seasonId=${seasonId}, userId=${userId}`);
      const result = await invitationService.generateSuggestedInvitations(seasonId, userId);
      console.log(`[POST generate-suggested] Success: created ${result.created} invitations`);
      res.status(201).json({ 
        data: result,
        message: `Đã tạo ${result.created} lời mời đề xuất`
      });
    } catch (error: any) {
      console.error('[POST generate-suggested] Error:', error);
      res.status(500).json({ error: "Failed to generate suggested invitations" });
    }
  }
);

/**
 * POST /api/seasons/:seasonId/invitations/send-all
 * Send all draft invitations (Phase 2)
 */
router.post(
  "/:seasonId/invitations/send-all",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      if (isNaN(seasonId)) {
        return res.status(400).json({ error: "Invalid season ID" });
      }
      const { deadlineDays } = req.body;
      console.log(`[POST send-all] seasonId=${seasonId}, deadlineDays=${deadlineDays || 14}`);
      const sent = await invitationService.sendAllDraftInvitations(seasonId, deadlineDays || 14);
      console.log(`[POST send-all] Success: sent ${sent} invitations`);
      res.json({ 
        data: { sent },
        message: `Đã gửi ${sent} lời mời`
      });
    } catch (error: any) {
      console.error('[POST send-all] Error:', error);
      res.status(500).json({ error: "Failed to send invitations" });
    }
  }
);

/**
 * POST /api/seasons/:seasonId/invitations/send
 * Send specific invitations
 */
router.post(
  "/:seasonId/invitations/send",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { invitationIds, deadlineDays } = req.body;
      if (!invitationIds || !Array.isArray(invitationIds) || invitationIds.length === 0) {
        return res.status(400).json({ error: "invitationIds array is required" });
      }
      const sent = await invitationService.sendInvitations(invitationIds, deadlineDays || 14);
      res.json({ 
        data: { sent },
        message: `Đã gửi ${sent} lời mời`
      });
    } catch (error: any) {
      console.error('[POST send]', error);
      res.status(500).json({ error: "Failed to send invitations" });
    }
  }
);

/**
 * POST /api/seasons/:seasonId/invitations/auto-create
 * Automatically create invitations (legacy - uses existing service)
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
      console.error('[POST auto-create]', error);
      res.status(500).json({ error: "Failed to auto-create invitations" });
    }
  }
);

/**
 * GET /api/seasons/:seasonId/invitations/:invitationId/eligibility
 * Check team eligibility based on rules
 */
router.get(
  "/:seasonId/invitations/:invitationId/eligibility",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const invitationId = parseInt(req.params.invitationId, 10);
      const invitation = await invitationService.getInvitationDetails(invitationId);
      
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      // Get team registration details
      const teamResult = await query<{
        player_count: number;
        foreign_count: number;
        stadium_capacity: number;
        stadium_country: string;
        stadium_stars: number;
      }>(
        `
        SELECT 
          (SELECT COUNT(*) FROM season_player_registrations spr 
           INNER JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id 
           WHERE stp.team_id = @teamId AND stp.season_id = @seasonId) as player_count,
          (SELECT COUNT(*) FROM season_player_registrations spr 
           INNER JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id 
           INNER JOIN players p ON spr.player_id = p.player_id
           WHERE stp.team_id = @teamId AND stp.season_id = @seasonId 
           AND p.nationality NOT IN ('Vietnam', 'Việt Nam', 'VN')) as foreign_count,
          ISNULL(s.capacity, 0) as stadium_capacity,
          ISNULL(s.country, 'Vietnam') as stadium_country,
          ISNULL(s.fifa_stars, 0) as stadium_stars
        FROM teams t
        LEFT JOIN stadiums s ON t.home_stadium_id = s.stadium_id
        WHERE t.team_id = @teamId
      `,
        { teamId: invitation.team_id, seasonId: invitation.season_id }
      );

      const data = teamResult.recordset[0] || {};
      
      const checks = [
        { 
          rule: 'Số cầu thủ 16-22', 
          passed: data.player_count >= 16 && data.player_count <= 22,
          value: data.player_count,
          message: data.player_count < 16 ? `Thiếu ${16 - data.player_count} cầu thủ` : 
                   data.player_count > 22 ? `Thừa ${data.player_count - 22} cầu thủ` : 'Đạt'
        },
        { 
          rule: 'Ngoại binh tối đa 5', 
          passed: data.foreign_count <= 5,
          value: data.foreign_count,
          message: data.foreign_count > 5 ? `Thừa ${data.foreign_count - 5} ngoại binh` : 'Đạt'
        },
        { 
          rule: 'Sức chứa sân ≥ 10,000', 
          passed: data.stadium_capacity >= 10000,
          value: data.stadium_capacity,
          message: data.stadium_capacity < 10000 ? `Thiếu ${10000 - data.stadium_capacity} chỗ` : 'Đạt'
        },
        { 
          rule: 'Sân tại Việt Nam', 
          passed: ['Vietnam', 'Việt Nam', 'VN', 'vietnam'].includes(data.stadium_country),
          value: data.stadium_country,
          message: data.stadium_country
        },
        { 
          rule: 'Sân đạt 2 sao FIFA', 
          passed: data.stadium_stars >= 2,
          value: data.stadium_stars,
          message: data.stadium_stars < 2 ? `Cần thêm ${2 - data.stadium_stars} sao` : 'Đạt'
        }
      ];

      const allPassed = checks.every(c => c.passed);

      res.json({ 
        data: { 
          checks, 
          allPassed,
          summary: allPassed ? 'Đủ điều kiện tham dự' : 'Chưa đủ điều kiện'
        } 
      });
    } catch (error: any) {
      console.error('[GET eligibility]', error);
      res.status(500).json({ error: "Failed to check eligibility" });
    }
  }
);

/**
 * PATCH /api/seasons/:seasonId/invitations/:invitationId/status
 * Update invitation status
 * - Team admin can accept/decline invitations for their teams
 * - Super admin / manage_teams can do all status changes
 */
router.patch(
  "/:seasonId/invitations/:invitationId/status",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const invitationId = parseInt(req.params.invitationId, 10);
      const { status, responseNotes } = req.body;
      
      // Get invitation to check team ownership
      const invitations = await invitationService.getSeasonInvitations(parseInt(req.params.seasonId, 10));
      const invitation = invitations.find(inv => inv.invitation_id === invitationId);
      
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      // Check permissions
      const hasManageTeams = req.user?.permissions?.includes('manage_teams');
      const isSuperAdmin = req.user?.roles?.includes('super_admin');
      const userTeamIds = req.user?.teamIds || [];
      const isTeamOwner = userTeamIds.includes(invitation.team_id);
      
      // Team admin can only accept/decline their own invitations
      if (!hasManageTeams && !isSuperAdmin) {
        if (!isTeamOwner) {
          return res.status(403).json({ error: "You don't have permission to update this invitation" });
        }
        if (!['accepted', 'declined', 'rejected'].includes(status)) {
          return res.status(403).json({ error: "You can only accept or decline invitations" });
        }
      }
      
      console.log(`[PATCH status] invitationId=${invitationId}, status=${status}, user=${req.user?.sub}`);
      
      switch (status) {
        case 'accepted':
          await invitationService.acceptInvitation(invitationId, responseNotes);
          break;
        case 'declined':
        case 'rejected':
          await invitationService.rejectInvitation(invitationId, responseNotes);
          break;
        case 'qualified':
          await invitationService.qualifyTeam(invitationId);
          break;
        case 'disqualified':
          await invitationService.disqualifyTeam(invitationId, responseNotes || 'Không đủ điều kiện');
          break;
        default:
          return res.status(400).json({ error: "Invalid status" });
      }
      
      console.log(`[PATCH status] Success: invitation ${invitationId} updated to ${status}`);
      res.json({ message: "Invitation status updated successfully" });
    } catch (error: any) {
      console.error('[PATCH status] Error:', error);
      res.status(500).json({ error: "Failed to update invitation status" });
    }
  }
);

/**
 * POST /api/seasons/:seasonId/invitations/:invitationId/create-replacement
 * Create replacement invitation for a rejected/disqualified team
 */
router.post(
  "/:seasonId/invitations/:invitationId/create-replacement",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      const invitationId = parseInt(req.params.invitationId, 10);
      const { newTeamId } = req.body;
      
      if (!newTeamId) {
        return res.status(400).json({ error: "newTeamId is required" });
      }
      
      const userId = req.user!.sub;
      const newInvitationId = await invitationService.createReplacementInvitation(
        seasonId, newTeamId, invitationId, userId
      );
      
      res.status(201).json({ 
        data: { invitationId: newInvitationId },
        message: "Replacement invitation created and sent" 
      });
    } catch (error: any) {
      console.error('[POST create-replacement]', error);
      res.status(500).json({ error: "Failed to create replacement invitation" });
    }
  }
);

/**
 * GET /api/seasons/:seasonId/invitations/reserve-teams
 * Get list of teams that can be invited as reserves
 */
router.get(
  "/:seasonId/invitations/reserve-teams",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      if (isNaN(seasonId)) {
        return res.status(400).json({ error: "Invalid season ID" });
      }
      const limit = parseInt(req.query.limit as string) || 10;
      const teams = await invitationService.getReserveTeams(seasonId, limit);
      res.json({ data: teams });
    } catch (error: any) {
      console.error('[GET reserve-teams]', error);
      res.status(500).json({ error: "Failed to get reserve teams" });
    }
  }
);

/**
 * POST /api/seasons/:seasonId/invitations/ensure-minimum-teams
 * Check and report if we have enough qualified teams
 */
router.post(
  "/:seasonId/invitations/ensure-minimum-teams",
  requireAuth,
  requireTeamManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const seasonId = parseInt(req.params.seasonId, 10);
      if (isNaN(seasonId)) {
        return res.status(400).json({ error: "Invalid season ID" });
      }
      
      const qualifiedCount = await invitationService.getQualifiedCount(seasonId);
      const targetTeams = 10;
      const isComplete = qualifiedCount >= targetTeams;
      
      res.json({ 
        data: {
          qualifiedCount,
          targetTeams,
          isComplete,
          remaining: Math.max(0, targetTeams - qualifiedCount)
        },
        message: isComplete 
          ? `Đã đủ ${targetTeams} đội đủ điều kiện. Có thể sinh lịch thi đấu.`
          : `Còn thiếu ${targetTeams - qualifiedCount} đội đủ điều kiện.`
      });
    } catch (error: any) {
      console.error('[POST ensure-minimum-teams]', error);
      res.status(500).json({ error: "Failed to check minimum teams" });
    }
  }
);

export default router;