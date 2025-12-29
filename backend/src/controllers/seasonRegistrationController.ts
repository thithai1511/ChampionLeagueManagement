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
    const registrations = await registrationService.getSeasonRegistrations(seasonId, status);

    res.json({ data: registrations });
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

    const updatedRegistration = await registrationService.changeTeamStatus(
      registrationId,
      "ACCEPTED",
      {
        note: req.body.note,
        reviewedBy: req.user?.sub,
      }
    );

    res.json({ data: updatedRegistration });
  } catch (error: any) {
    console.error("Accept invitation error:", error);
    if (error.message?.includes("Invalid state transition")) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Failed to accept invitation" });
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

    const updatedRegistration = await registrationService.changeTeamStatus(
      registrationId,
      "DECLINED",
      {
        note: req.body.note || "Team declined invitation",
        reviewedBy: req.user?.sub,
      }
    );

    res.json({ data: updatedRegistration });
  } catch (error: any) {
    console.error("Decline invitation error:", error);
    if (error.message?.includes("Invalid state transition")) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Failed to decline invitation" });
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

    // Get all seasons and check registrations
    const result = await registrationService.getSeasonRegistrations(0); // Get all
    const teamRegistrations = result.filter((r) => r.team_id === teamId);

    res.json({ data: teamRegistrations });
  } catch (error: any) {
    console.error("Get team registrations error:", error);
    res.status(500).json({ error: "Failed to get team registrations" });
  }
}
