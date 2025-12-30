/**
 * Season Team Registration Controller
 * 
 * Handles HTTP requests for team registration workflow:
 * - BTC: Create invitations, review submissions, approve/reject
 * - Teams: Accept/decline invitations, submit documents
 */

import { Response } from "express";
import { AuthenticatedRequest } from "../types";
import * as registrationService from "../services/seasonRegistrationService";
import * as participationFeeService from "../services/participationFeeService";

// Map backend status to frontend status
function mapStatusToFrontend(backendStatus: string): string {
  const statusMap: Record<string, string> = {
    'DRAFT_INVITE': 'draft',
    'INVITED': 'pending',
    'ACCEPTED': 'accepted',
    'DECLINED': 'declined',
    'SUBMITTED': 'submitted',
    'REQUEST_CHANGE': 'changes_requested',
    'APPROVED': 'approved',
    'REJECTED': 'rejected',
  };
  return statusMap[backendStatus] || backendStatus.toLowerCase();
}

// Transform registration to invitation format for frontend
function toInvitationFormat(reg: registrationService.SeasonRegistration & { team_logo?: string; short_name?: string }): any {
  return {
    // CamelCase fields (Legacy/Mobile)
    invitationId: reg.registration_id,
    registrationId: reg.registration_id,
    seasonId: reg.season_id,
    teamId: reg.team_id,
    teamName: reg.team_name,
    teamLogo: reg.team_logo || null,
    shortName: reg.short_name || null,
    inviteType: 'promotion', // Default type
    status: mapStatusToFrontend(reg.registration_status),
    responseDeadline: reg.created_at ? new Date(new Date(reg.created_at).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString() : null,
    feeStatus: reg.fee_status,
    submittedAt: reg.submitted_at,
    reviewedAt: reg.reviewed_at,
    reviewerNote: reg.reviewer_note,
    createdAt: reg.created_at,
    updatedAt: reg.updated_at,
    submissionData: typeof reg.submission_data === 'string' ? JSON.parse(reg.submission_data || '{}') : reg.submission_data,

    // Snake_case fields (Admin Portal / TeamRegistrationWorkflow.jsx)
    registration_id: reg.registration_id,
    season_id: reg.season_id,
    team_id: reg.team_id,
    team_name: reg.team_name,
    registration_status: reg.registration_status,
    fee_status: reg.fee_status,
    submission_data: typeof reg.submission_data === 'string' ? JSON.parse(reg.submission_data || '{}') : reg.submission_data,
    reviewer_note: reg.reviewer_note,
    submitted_at: reg.submitted_at,
    reviewed_at: reg.reviewed_at,
    created_at: reg.created_at
  };
}

/**
 * GET /api/seasons/:seasonId/registrations/my
 * Get MY registration for a specific season (Top 1)
 */
export async function getMyRegistrationForSeason(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    if (isNaN(seasonId)) {
      res.status(400).json({ error: "Invalid season ID" });
      return;
    }

    if (!req.user || !req.user.teamIds || req.user.teamIds.length === 0) {
      res.status(403).json({ error: "User is not assigned to any team" });
      return;
    }
    const teamId = Number(req.user.teamIds[0]);

    // Use participationFeeService to get the latest registration
    const registration = await participationFeeService.getMyFee(seasonId, teamId);

    if (!registration) {
      res.status(404).json({ error: "Registration not found" });
      return;
    }

    // Format matches toInvitationFormat but we used a different service return type
    // Casting to any to allow passing to toInvitationFormat which expects more fields but handles undefined
    res.json({ data: toInvitationFormat(registration as any) });

  } catch (error: any) {
    console.error("Get my registration error:", error);
    res.status(500).json({ error: "Failed to get my registration" });
  }
}

/**
 * GET /api/seasons/:seasonId/registrations
 * List all registrations for a season (Admin only)
 */
export async function listRegistrations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    if (isNaN(seasonId)) {
      res.status(400).json({ error: "Invalid season ID" });
      return;
    }

    const status = req.query.status as registrationService.RegistrationStatus | undefined;
    const registrations = await registrationService.getSeasonRegistrationsWithTeamInfo(seasonId, status);

    // Transform to invitation format for frontend compatibility
    const invitations = registrations.map(toInvitationFormat);

    res.json({ data: invitations });
  } catch (error: any) {
    console.error("List registrations error:", error);
    res.status(500).json({ error: "Failed to list registrations" });
  }
}

/**
 * GET /api/registrations/:registrationId
 * Get registration details
 */
export async function getRegistration(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const registrationId = parseInt(req.params.registrationId, 10);
    if (isNaN(registrationId)) {
      res.status(400).json({ error: "Invalid registration ID" });
      return;
    }

    const registration = await registrationService.getRegistration(registrationId);
    if (!registration) {
      res.status(404).json({ error: "Registration not found" });
      return;
    }

    res.json({ data: registration });
  } catch (error: any) {
    console.error("Get registration error:", error);
    res.status(500).json({ error: "Failed to get registration" });
  }
}

/**
 * POST /api/seasons/:seasonId/registrations
 * Create new registration (Admin - usually from invitation)
 */
export async function createRegistration(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    if (isNaN(seasonId)) {
      res.status(400).json({ error: "Invalid season ID" });
      return;
    }

    const { teamId, invitationId, status } = req.body;
    if (!teamId) {
      res.status(400).json({ error: "teamId is required" });
      return;
    }

    const registration = await registrationService.createRegistration(
      seasonId,
      parseInt(teamId, 10),
      invitationId ? parseInt(invitationId, 10) : undefined,
      status
    );

    res.status(201).json({ data: registration });
  } catch (error: any) {
    console.error("Create registration error:", error);
    res.status(500).json({ error: "Failed to create registration" });
  }
}

/**
 * POST /api/registrations/:registrationId/change-status
 * Change registration status (The "one-stop" API)
 * 
 * Request body:
 * {
 *   "status": "INVITED" | "ACCEPTED" | "DECLINED" | "SUBMITTED" | "REQUEST_CHANGE" | "APPROVED" | "REJECTED",
 *   "note": "Optional reviewer note",
 *   "submissionData": { ... } // For SUBMITTED status
 * }
 */
export async function changeStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const registrationId = parseInt(req.params.registrationId, 10);
    if (isNaN(registrationId)) {
      res.status(400).json({ error: "Invalid registration ID" });
      return;
    }

    const { status, note, submissionData } = req.body;
    if (!status) {
      res.status(400).json({ error: "status is required" });
      return;
    }

    // Validate status
    const validStatuses = [
      "DRAFT_INVITE",
      "INVITED",
      "ACCEPTED",
      "DECLINED",
      "SUBMITTED",
      "REQUEST_CHANGE",
      "APPROVED",
      "REJECTED",
    ];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const updatedRegistration = await registrationService.changeTeamStatus(
      registrationId,
      status as registrationService.RegistrationStatus,
      {
        note,
        submissionData,
        reviewedBy: req.user?.sub,
      }
    );

    res.json({ data: updatedRegistration });
  } catch (error: any) {
    console.error("Change status error:", error);
    if (error.message?.includes("Invalid state transition")) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Failed to change status" });
  }
}

/**
 * POST /api/registrations/:registrationId/accept
 * Team accepts invitation (shortcut for changeStatus)
 */
export async function acceptInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const registrationId = parseInt(req.params.registrationId, 10);
    if (isNaN(registrationId)) {
      res.status(400).json({ error: "Invalid registration ID" });
      return;
    }

    // Check current status first
    const currentRegistration = await registrationService.getRegistration(registrationId);
    if (!currentRegistration) {
      res.status(404).json({ error: "Không tìm thấy lời mời" });
      return;
    }

    // If already accepted, return success
    if (currentRegistration.registration_status === "ACCEPTED") {
      res.json({
        data: currentRegistration,
        message: "Lời mời đã được chấp nhận trước đó",
        alreadyAccepted: true
      });
      return;
    }

    // Check if in correct state to accept
    if (currentRegistration.registration_status !== "INVITED") {
      res.status(400).json({
        error: `Không thể chấp nhận lời mời ở trạng thái "${currentRegistration.registration_status}"`
      });
      return;
    }

    const updatedRegistration = await registrationService.changeTeamStatus(
      registrationId,
      "ACCEPTED",
      {
        note: req.body.note,
        reviewedBy: req.user?.sub,
      }
    );

    res.json({ data: updatedRegistration, message: "Đã chấp nhận lời mời thành công" });
  } catch (error: any) {
    console.error("Accept invitation error:", error);
    if (error.message?.includes("Invalid state transition")) {
      res.status(400).json({ error: "Lời mời đã được xử lý. Vui lòng tải lại trang." });
      return;
    }
    res.status(500).json({ error: "Không thể chấp nhận lời mời" });
  }
}

/**
 * POST /api/registrations/:registrationId/decline
 * Team declines invitation (shortcut for changeStatus)
 */
export async function declineInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const registrationId = parseInt(req.params.registrationId, 10);
    if (isNaN(registrationId)) {
      res.status(400).json({ error: "Invalid registration ID" });
      return;
    }

    // Check current status first
    const currentRegistration = await registrationService.getRegistration(registrationId);
    if (!currentRegistration) {
      res.status(404).json({ error: "Không tìm thấy lời mời" });
      return;
    }

    // If already declined, return success
    if (currentRegistration.registration_status === "DECLINED") {
      res.json({
        data: currentRegistration,
        message: "Lời mời đã được từ chối trước đó",
        alreadyDeclined: true
      });
      return;
    }

    // Check if in correct state to decline
    if (!["INVITED", "ACCEPTED"].includes(currentRegistration.registration_status)) {
      res.status(400).json({
        error: `Không thể từ chối lời mời ở trạng thái "${currentRegistration.registration_status}"`
      });
      return;
    }

    const updatedRegistration = await registrationService.changeTeamStatus(
      registrationId,
      "DECLINED",
      {
        note: req.body.note || "Đội từ chối tham gia",
        reviewedBy: req.user?.sub,
      }
    );

    res.json({ data: updatedRegistration, message: "Đã từ chối lời mời" });
  } catch (error: any) {
    console.error("Decline invitation error:", error);
    if (error.message?.includes("Invalid state transition")) {
      res.status(400).json({ error: "Lời mời đã được xử lý. Vui lòng tải lại trang." });
      return;
    }
    res.status(500).json({ error: "Không thể từ chối lời mời" });
  }
}

/**
 * POST /api/registrations/:registrationId/submit
 * Team submits registration documents
 */
export async function submitDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const registrationId = parseInt(req.params.registrationId, 10);
    if (isNaN(registrationId)) {
      res.status(400).json({ error: "Invalid registration ID" });
      return;
    }

    const { submissionData } = req.body;
    if (!submissionData) {
      res.status(400).json({ error: "submissionData is required" });
      return;
    }

    // Validate submission data
    if (!submissionData.stadium || !submissionData.kits) {
      res.status(400).json({ error: "Stadium and kits information are required" });
      return;
    }

    const updatedRegistration = await registrationService.changeTeamStatus(
      registrationId,
      "SUBMITTED",
      {
        submissionData,
        reviewedBy: req.user?.sub,
      }
    );

    res.json({ data: updatedRegistration });
  } catch (error: any) {
    console.error("Submit documents error:", error);
    if (error.message?.includes("Invalid state transition")) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Failed to submit documents" });
  }
}

/**
 * POST /api/registrations/:registrationId/approve
 * BTC approves registration (Admin only)
 */
export async function approveRegistration(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const registrationId = parseInt(req.params.registrationId, 10);
    if (isNaN(registrationId)) {
      res.status(400).json({ error: "Invalid registration ID" });
      return;
    }

    const updatedRegistration = await registrationService.changeTeamStatus(
      registrationId,
      "APPROVED",
      {
        note: req.body.note || "Registration approved",
        reviewedBy: req.user?.sub,
      }
    );

    // Check if season is ready for scheduling
    const registration = await registrationService.getRegistration(registrationId);
    if (registration) {
      const readyStatus = await registrationService.checkReadyForScheduling(registration.season_id);
      res.json({
        data: updatedRegistration,
        schedulingReady: readyStatus.ready,
        approvedCount: readyStatus.approvedCount,
        requiredCount: readyStatus.requiredCount,
      });
      return;
    }

    res.json({ data: updatedRegistration });
  } catch (error: any) {
    console.error("Approve registration error:", error);
    if (error.message?.includes("Invalid state transition")) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Failed to approve registration" });
  }
}

/**
 * POST /api/registrations/:registrationId/reject
 * BTC rejects registration (Admin only)
 */
export async function rejectRegistration(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const registrationId = parseInt(req.params.registrationId, 10);
    if (isNaN(registrationId)) {
      res.status(400).json({ error: "Invalid registration ID" });
      return;
    }

    const { note } = req.body;
    if (!note) {
      res.status(400).json({ error: "Rejection reason (note) is required" });
      return;
    }

    const updatedRegistration = await registrationService.changeTeamStatus(
      registrationId,
      "REJECTED",
      {
        note,
        reviewedBy: req.user?.sub,
      }
    );

    res.json({ data: updatedRegistration });
  } catch (error: any) {
    console.error("Reject registration error:", error);
    if (error.message?.includes("Invalid state transition")) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Failed to reject registration" });
  }
}

/**
 * POST /api/registrations/:registrationId/request-change
 * BTC requests changes to submission (Admin only)
 */
export async function requestChange(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const registrationId = parseInt(req.params.registrationId, 10);
    if (isNaN(registrationId)) {
      res.status(400).json({ error: "Invalid registration ID" });
      return;
    }

    const { note } = req.body;
    if (!note) {
      res.status(400).json({ error: "Change request reason (note) is required" });
      return;
    }

    const updatedRegistration = await registrationService.changeTeamStatus(
      registrationId,
      "REQUEST_CHANGE",
      {
        note,
        reviewedBy: req.user?.sub,
      }
    );

    res.json({ data: updatedRegistration });
  } catch (error: any) {
    console.error("Request change error:", error);
    if (error.message?.includes("Invalid state transition")) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Failed to request change" });
  }
}

/**
 * GET /api/seasons/:seasonId/registrations/statistics
 * Get registration statistics for a season (Admin only)
 */
export async function getStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    if (isNaN(seasonId)) {
      res.status(400).json({ error: "Invalid season ID" });
      return;
    }

    const stats = await registrationService.getStatusStatistics(seasonId);
    const readyStatus = await registrationService.checkReadyForScheduling(seasonId);

    res.json({
      data: {
        statusCounts: stats,
        schedulingReady: readyStatus.ready,
        approvedCount: readyStatus.approvedCount,
        requiredCount: readyStatus.requiredCount,
      },
    });
  } catch (error: any) {
    console.error("Get statistics error:", error);
    res.status(500).json({ error: "Failed to get statistics" });
  }
}

/**
 * POST /api/seasons/:seasonId/registrations/send-invitations
 * Batch send all draft invitations (Admin only)
 */
export async function sendAllInvitations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    if (isNaN(seasonId)) {
      res.status(400).json({ error: "Invalid season ID" });
      return;
    }

    const result = await registrationService.batchSendInvitations(seasonId, req.user?.sub);

    res.json({
      data: {
        sent: result.sent,
        failed: result.failed,
        message: `Sent ${result.sent} invitations, ${result.failed} failed`,
      },
    });
  } catch (error: any) {
    console.error("Send all invitations error:", error);
    res.status(500).json({ error: "Failed to send invitations" });
  }
}

/**
 * GET /api/teams/:teamId/registrations
 * Get registrations for a specific team (Team admin view)
 */
export async function getTeamRegistrations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    if (isNaN(teamId)) {
      res.status(400).json({ error: "Invalid team ID" });
      return;
    }

    // Get registrations for this team across all seasons
    const result = await registrationService.getTeamRegistrationsAcrossSeasons(teamId);

    res.json({ data: result });
  } catch (error: any) {
    console.error("Get team registrations error:", error);
    res.status(500).json({ error: "Failed to get team registrations" });
  }
}

/**
 * POST /api/seasons/:seasonId/invitations/generate-suggested
 * Generate draft invitations for eligible teams (Admin only)
 * Logic: 8 đội top 8 BXH mùa trước + 2 đội thăng hạng = 10 đội
 */
export async function generateSuggestedInvitations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    if (isNaN(seasonId)) {
      res.status(400).json({ error: "Invalid season ID" });
      return;
    }

    const result = await registrationService.generateSuggestedInvitations(seasonId);

    // Build detailed message
    let message = `Đã tạo ${result.created} lời mời`;
    if (result.skipped > 0) {
      message += ` (bỏ qua ${result.skipped} đội đã có lời mời)`;
    }

    res.json({
      message,
      data: {
        created: result.created,
        skipped: result.skipped,
        teams: result.teams,
        errors: result.errors,
      },
      warnings: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error: any) {
    console.error("Generate suggested invitations error:", error);
    res.status(500).json({
      error: "Không thể tạo danh sách lời mời",
      details: error.message
    });
  }
}

/**
 * POST /api/seasons/:seasonId/invitations
 * Create a new invitation for a team
 */
export async function createInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    if (isNaN(seasonId)) {
      res.status(400).json({ error: "Invalid season ID" });
      return;
    }

    const { teamId, inviteType, deadlineDays } = req.body;
    if (!teamId) {
      res.status(400).json({ error: "teamId is required" });
      return;
    }

    // Check if team already has an invitation/registration for this season
    const existingRegistrations = await registrationService.getSeasonRegistrations(seasonId);
    const existingForTeam = existingRegistrations.find(r => r.team_id === parseInt(teamId, 10));

    if (existingForTeam) {
      res.status(409).json({
        error: `Đội bóng "${existingForTeam.team_name}" đã có lời mời/đăng ký cho mùa giải này (Trạng thái: ${existingForTeam.registration_status})`,
        existingRegistration: {
          registrationId: existingForTeam.registration_id,
          status: existingForTeam.registration_status,
          teamName: existingForTeam.team_name,
        }
      });
      return;
    }

    const registration = await registrationService.createRegistration(
      seasonId,
      parseInt(teamId, 10),
      undefined,
      "DRAFT_INVITE"
    );

    res.status(201).json({
      data: {
        ...registration,
        invitationId: registration.registration_id,
        inviteType: inviteType || 'promotion',
        deadlineDays: deadlineDays || 14,
      }
    });
  } catch (error: any) {
    console.error("Create invitation error:", error);
    // Handle duplicate key error specifically
    if (error.message?.includes('UNIQUE KEY') || error.message?.includes('duplicate')) {
      res.status(409).json({ error: "Đội bóng đã có lời mời cho mùa giải này" });
      return;
    }
    res.status(500).json({ error: "Failed to create invitation" });
  }
}

/**
 * PATCH /api/seasons/:seasonId/invitations/:invitationId
 * Update invitation details
 */
export async function updateInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const invitationId = parseInt(req.params.invitationId, 10);
    if (isNaN(invitationId)) {
      res.status(400).json({ error: "Invalid invitation ID" });
      return;
    }

    // For now, just return success - deadline is tracked in the workflow
    const registration = await registrationService.getRegistration(invitationId);
    if (!registration) {
      res.status(404).json({ error: "Invitation not found" });
      return;
    }

    res.json({ data: registration });
  } catch (error: any) {
    console.error("Update invitation error:", error);
    res.status(500).json({ error: "Failed to update invitation" });
  }
}

/**
 * PATCH /api/seasons/:seasonId/invitations/:invitationId/status
 * Update invitation status
 */
export async function updateInvitationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const invitationId = parseInt(req.params.invitationId, 10);
    if (isNaN(invitationId)) {
      res.status(400).json({ error: "Invalid invitation ID" });
      return;
    }

    const { status, responseNotes } = req.body;
    if (!status) {
      res.status(400).json({ error: "status is required" });
      return;
    }

    // Check current status first - skip if already in target status
    const currentRegistration = await registrationService.getRegistration(invitationId);
    if (!currentRegistration) {
      res.status(404).json({ error: "Invitation not found" });
      return;
    }

    // If already in target status, return success without error
    if (currentRegistration.registration_status === status) {
      res.json({
        data: currentRegistration,
        message: "Already in target status",
        skipped: true
      });
      return;
    }

    const updatedRegistration = await registrationService.changeTeamStatus(
      invitationId,
      status as registrationService.RegistrationStatus,
      {
        note: responseNotes,
        reviewedBy: req.user?.sub,
      }
    );

    res.json({ data: updatedRegistration });
  } catch (error: any) {
    console.error("Update invitation status error:", error);
    if (error.message?.includes("Invalid state transition")) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Failed to update invitation status" });
  }
}

/**
 * DELETE /api/seasons/:seasonId/invitations/:invitationId
 * Delete an invitation
 */
export async function deleteInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const invitationId = parseInt(req.params.invitationId, 10);
    if (isNaN(invitationId)) {
      res.status(400).json({ error: "Invalid invitation ID" });
      return;
    }

    await registrationService.deleteRegistration(invitationId);

    res.json({ success: true, message: "Invitation deleted" });
  } catch (error: any) {
    console.error("Delete invitation error:", error);
    res.status(500).json({ error: "Failed to delete invitation" });
  }
}