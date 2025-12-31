/**
 * Match Lifecycle Controller
 * 
 * Handles HTTP requests for match lifecycle management
 */

import { Response } from "express";
import { AuthenticatedRequest } from "../types";
import * as matchLifecycleService from "../services/matchLifecycleService";
import * as supervisorReportService from "../services/supervisorReportService";
import * as matchReportService from "../services/matchReportService";
import { query } from "../db/sqlServer";

/**
 * GET /api/matches/:matchId/details
 * Get match details with lifecycle information
 */
export async function getMatchDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    if (isNaN(matchId)) {
      res.status(400).json({ error: "Invalid match ID" });
      return;
    }

    const match = await matchLifecycleService.getMatchDetails(matchId);
    if (!match) {
      res.status(404).json({ error: "Match not found" });
      return;
    }

    res.json({ data: match });
  } catch (error: any) {
    console.error("Get match details error:", error);
    res.status(500).json({ error: "Failed to get match details" });
  }
}

/**
 * POST /api/matches/:matchId/change-status
 * Change match status (one-stop API)
 */
export async function changeStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    if (isNaN(matchId)) {
      res.status(400).json({ error: "Invalid match ID" });
      return;
    }

    const { status, note } = req.body;
    if (!status) {
      res.status(400).json({ error: "status is required" });
      return;
    }

    const validStatuses = ["SCHEDULED", "PREPARING", "READY", "IN_PROGRESS", "FINISHED", "REPORTED", "COMPLETED"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const updatedMatch = await matchLifecycleService.changeMatchStatus(
      matchId,
      status as matchLifecycleService.MatchStatus,
      {
        note,
        changedBy: req.user?.sub,
      }
    );

    res.json({ data: updatedMatch });
  } catch (error: any) {
    console.error("Change status error:", error);
    if (error.message?.includes("Invalid state transition") || error.message?.includes("Cannot move to")) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Failed to change status" });
  }
}

/**
 * POST /api/matches/:matchId/assign-officials
 * Assign officials to a match (transitions to PREPARING)
 */
export async function assignOfficials(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    if (isNaN(matchId)) {
      res.status(400).json({ error: "Invalid match ID" });
      return;
    }

    const { mainRefereeId, assistantReferee1Id, assistantReferee2Id, fourthOfficialId, supervisorId } = req.body;

    if (!mainRefereeId) {
      res.status(400).json({ error: "mainRefereeId is required" });
      return;
    }

    const updatedMatch = await matchLifecycleService.assignOfficials(
      {
        matchId,
        mainRefereeId: parseInt(mainRefereeId, 10),
        assistantReferee1Id: assistantReferee1Id ? parseInt(assistantReferee1Id, 10) : undefined,
        assistantReferee2Id: assistantReferee2Id ? parseInt(assistantReferee2Id, 10) : undefined,
        fourthOfficialId: fourthOfficialId ? parseInt(fourthOfficialId, 10) : undefined,
        supervisorId: supervisorId ? parseInt(supervisorId, 10) : undefined,
      },
      req.user?.sub
    );

    res.json({ data: updatedMatch });
  } catch (error: any) {
    console.error("Assign officials error:", error);
    if (error.message?.includes("Can only assign")) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Failed to assign officials" });
  }
}

/**
 * POST /api/matches/:matchId/lineup-status
 * Update lineup status for a team
 */
export async function updateLineupStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    if (isNaN(matchId)) {
      res.status(400).json({ error: "Invalid match ID" });
      return;
    }

    const { teamType, status, rejectionReason } = req.body;

    if (!teamType || !status) {
      res.status(400).json({ error: "teamType and status are required" });
      return;
    }

    if (!["home", "away"].includes(teamType)) {
      res.status(400).json({ error: "teamType must be 'home' or 'away'" });
      return;
    }

    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      res.status(400).json({ error: "status must be PENDING, APPROVED, or REJECTED" });
      return;
    }

    if (status === "REJECTED" && !rejectionReason) {
      res.status(400).json({ error: "rejectionReason is required when status is REJECTED" });
      return;
    }

    const updatedMatch = await matchLifecycleService.updateLineupStatus(
      matchId,
      teamType as "home" | "away",
      status as "PENDING" | "APPROVED" | "REJECTED",
      req.user?.sub,
      rejectionReason
    );

    res.json({ data: updatedMatch });
  } catch (error: any) {
    console.error("Update lineup status error:", error);
    res.status(500).json({ error: "Failed to update lineup status" });
  }
}

/**
 * GET /api/seasons/:seasonId/matches/by-status
 * Get matches by status
 */
export async function getMatchesByStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    if (isNaN(seasonId)) {
      res.status(400).json({ error: "Invalid season ID" });
      return;
    }

    const status = req.query.status as matchLifecycleService.MatchStatus;
    if (!status) {
      res.status(400).json({ error: "status query parameter is required" });
      return;
    }

    const matches = await matchLifecycleService.getMatchesByStatus(seasonId, status);
    res.json({ data: matches });
  } catch (error: any) {
    console.error("Get matches by status error:", error);
    res.status(500).json({ error: "Failed to get matches" });
  }
}

/**
 * GET /api/seasons/:seasonId/matches/lifecycle-statistics
 * Get lifecycle statistics for a season
 */
export async function getLifecycleStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    if (isNaN(seasonId)) {
      res.status(400).json({ error: "Invalid season ID" });
      return;
    }

    const stats = await matchLifecycleService.getLifecycleStatistics(seasonId);
    res.json({ data: stats });
  } catch (error: any) {
    console.error("Get lifecycle statistics error:", error);
    res.status(500).json({ error: "Failed to get statistics" });
  }
}

/**
 * POST /api/matches/:matchId/supervisor-report
 * Submit supervisor report
 */
export async function submitSupervisorReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    if (isNaN(matchId)) {
      res.status(400).json({ error: "Invalid match ID" });
      return;
    }

    const {
      organizationRating,
      homeTeamRating,
      awayTeamRating,
      stadiumConditionRating,
      securityRating,
      incidentReport,
      hasSeriousViolation,
      sendToDisciplinary,
      recommendations,
    } = req.body;

    const report = await supervisorReportService.createSupervisorReport({
      matchId,
      supervisorId: req.user!.sub,
      organizationRating,
      homeTeamRating,
      awayTeamRating,
      stadiumConditionRating,
      securityRating,
      incidentReport,
      hasSeriousViolation,
      sendToDisciplinary,
      recommendations,
    });

    res.json({ data: report });
  } catch (error: any) {
    console.error("Submit supervisor report error:", error);
    if (error.message?.includes("not the assigned supervisor") || error.message?.includes("Cannot submit report")) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Failed to submit supervisor report" });
  }
}

/**
 * GET /api/matches/:matchId/supervisor-report
 * Get supervisor report for a match
 */
export async function getSupervisorReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    if (isNaN(matchId)) {
      res.status(400).json({ error: "Invalid match ID" });
      return;
    }

    const report = await supervisorReportService.getSupervisorReport(matchId);
    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    res.json({ data: report });
  } catch (error: any) {
    console.error("Get supervisor report error:", error);
    res.status(500).json({ error: "Failed to get supervisor report" });
  }
}

/**
 * GET /api/supervisor/my-reports
 * Get supervisor's own reports
 */
export async function getMySupervisorReports(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const seasonId = req.query.seasonId ? parseInt(req.query.seasonId as string, 10) : undefined;

    const reports = await supervisorReportService.getSupervisorReportsBySupervisor(
      req.user!.sub,
      seasonId
    );

    res.json({ data: reports });
  } catch (error: any) {
    console.error("Get my supervisor reports error:", error);
    res.status(500).json({ error: "Failed to get reports" });
  }
}

/**
 * GET /api/admin/supervisor-reports/disciplinary
 * Get reports flagged for disciplinary review
 */
export async function getDisciplinaryReports(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const seasonId = req.query.seasonId ? parseInt(req.query.seasonId as string, 10) : undefined;

    const reports = await supervisorReportService.getReportsForDisciplinaryReview(seasonId);
    res.json({ data: reports });
  } catch (error: any) {
    console.error("Get disciplinary reports error:", error);
    res.status(500).json({ error: "Failed to get disciplinary reports" });
  }
}

/**
 * POST /api/admin/supervisor-reports/:reportId/review
 * Review supervisor report
 * Body: { action: 'approve' | 'rejected' | 'request_changes', feedback?: string }
 */
export async function reviewSupervisorReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const reportId = parseInt(req.params.reportId, 10);
    if (isNaN(reportId)) {
      res.status(400).json({ error: "Invalid report ID" });
      return;
    }

    const { action = 'approve', feedback, notes } = req.body;
    
    // Validate action
    const validActions = ['approve', 'rejected', 'request_changes'];
    if (!validActions.includes(action)) {
      res.status(400).json({ error: "Invalid action. Must be: approve, rejected, or request_changes" });
      return;
    }

    await supervisorReportService.reviewSupervisorReport(
      reportId, 
      req.user!.sub, 
      action, 
      feedback || notes
    );

    res.json({ 
      message: action === 'approve' ? "Đã duyệt báo cáo" :
               action === 'rejected' ? "Đã từ chối báo cáo" :
               "Đã gửi yêu cầu sửa đổi",
      action 
    });
  } catch (error: any) {
    console.error("Review supervisor report error:", error);
    res.status(500).json({ error: "Failed to review report" });
  }
}

/**
 * GET /api/admin/supervisor-reports
 * Get all supervisor reports (for admin)
 * Query: ?seasonId=1
 */
export async function getAllSupervisorReports(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const seasonId = req.query.seasonId ? parseInt(req.query.seasonId as string, 10) : undefined;

    console.log(`[getAllSupervisorReports] Request from user ${req.user?.sub}, seasonId: ${seasonId}`);
    const reports = await supervisorReportService.getAllSupervisorReports(seasonId);
    console.log(`[getAllSupervisorReports] Returning ${reports.length} reports`);
    res.json({ data: reports });
  } catch (error: any) {
    console.error("Get all supervisor reports error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Failed to get supervisor reports", details: error.message });
  }
}

/**
 * GET /api/seasons/:seasonId/supervisor-reports/statistics
 * Get supervisor report statistics for a season
 */
export async function getSupervisorReportStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const seasonId = parseInt(req.params.seasonId, 10);
    if (isNaN(seasonId)) {
      res.status(400).json({ error: "Invalid season ID" });
      return;
    }

    const stats = await supervisorReportService.getSupervisorReportStatistics(seasonId);
    res.json({ data: stats });
  } catch (error: any) {
    console.error("Get supervisor report statistics error:", error);
    res.status(500).json({ error: "Failed to get statistics" });
  }
}

// ============================================================
// REFEREE REPORT CONTROLLERS
// ============================================================

/**
 * POST /api/matches/:matchId/referee-report
 * Submit referee match report
 */
export async function submitRefereeReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    if (isNaN(matchId)) {
      res.status(400).json({ error: "Invalid match ID" });
      return;
    }

    const {
      weather,
      attendance,
      matchSummary,
      notes,
      incidents,
      mvpPlayerId,
      mvpPlayerName,
      mvpTeamName,
      homeScore,
      awayScore,
      goalScorers,
      goalDetails, // Accept both goalScorers and goalDetails
      cardDetails,
      totalYellowCards,
      totalRedCards,
    } = req.body;

    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    // Log incoming data for debugging
    console.log("[submitRefereeReport] Incoming data:", {
      matchId,
      userId,
      hasWeather: !!weather,
      hasAttendance: !!attendance,
      hasMatchSummary: !!matchSummary,
      hasMvpPlayerId: !!mvpPlayerId,
      mvpPlayerId,
      homeScore,
      awayScore,
      totalYellowCards,
      totalRedCards,
      hasGoalDetails: !!goalDetails,
      hasCardDetails: !!cardDetails
    });

    // Create/update match report
    const report = await matchReportService.createMatchReport(matchId, userId, {
      weather_condition: weather || null,
      attendance: attendance ? parseInt(String(attendance), 10) : null,
      match_summary: matchSummary || null,
      referee_notes: notes || null,
      incidents: incidents || null,
      mvp_player_id: mvpPlayerId ? parseInt(String(mvpPlayerId), 10) : null,
      mvp_player_name: mvpPlayerName || null,
      mvp_team_name: mvpTeamName || null,
      home_score: homeScore !== undefined && homeScore !== null ? parseInt(String(homeScore), 10) : null,
      away_score: awayScore !== undefined && awayScore !== null ? parseInt(String(awayScore), 10) : null,
      total_yellow_cards: totalYellowCards !== undefined && totalYellowCards !== null ? parseInt(String(totalYellowCards), 10) : 0,
      total_red_cards: totalRedCards !== undefined && totalRedCards !== null ? parseInt(String(totalRedCards), 10) : 0,
      goal_details: goalDetails || (goalScorers ? JSON.stringify(goalScorers) : null),
      card_details: cardDetails || null,
    });

    // Also create/update MVP record in match_mvps table if MVP provided
    if (mvpPlayerId && mvpPlayerName) {
      try {
        await query(
          `
          MERGE match_mvps AS target
          USING (SELECT @matchId AS match_id) AS source
          ON target.match_id = source.match_id
          WHEN MATCHED THEN
            UPDATE SET player_id = @mvpPlayerId, player_name = @mvpPlayerName, team_name = @mvpTeamName, selected_by = @selectedBy, created_at = SYSUTCDATETIME()
          WHEN NOT MATCHED THEN
            INSERT (match_id, player_id, player_name, team_name, selected_by, created_at)
            VALUES (@matchId, @mvpPlayerId, @mvpPlayerName, @mvpTeamName, @selectedBy, SYSUTCDATETIME());
          `,
          {
            matchId,
            mvpPlayerId: parseInt(mvpPlayerId, 10),
            mvpPlayerName,
            mvpTeamName: mvpTeamName || null,
            selectedBy: userId,
          }
        );
      } catch (mvpError) {
        console.error("Error saving MVP:", mvpError);
        // Don't fail the whole request if MVP save fails
      }
    }

    res.json({ data: report, message: "Báo cáo trọng tài đã được gửi thành công" });
  } catch (error: any) {
    console.error("Submit referee report error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      number: error.number,
      originalError: error.originalError,
      stack: error.stack
    });
    
    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message || "Failed to submit referee report"
      : "Failed to submit referee report";
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        code: error.code,
        number: error.number,
        sqlError: error.originalError?.message
      } : undefined
    });
  }
}

/**
 * POST /api/matches/:matchId/mark-referee-report
 * Mark that referee has submitted their report
 */
export async function markRefereeReportSubmitted(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    if (isNaN(matchId)) {
      res.status(400).json({ error: "Invalid match ID" });
      return;
    }

    await query(
      `UPDATE matches SET referee_report_submitted = 1, referee_report_at = SYSUTCDATETIME() WHERE match_id = @matchId`,
      { matchId }
    );

    res.json({ message: "Referee report marked as submitted" });
  } catch (error: any) {
    console.error("Mark referee report error:", error);
    res.status(500).json({ error: "Failed to mark referee report" });
  }
}

/**
 * POST /api/matches/:matchId/mark-supervisor-report
 * Mark that supervisor has submitted their report
 */
export async function markSupervisorReportSubmitted(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const matchId = parseInt(req.params.matchId, 10);
    if (isNaN(matchId)) {
      res.status(400).json({ error: "Invalid match ID" });
      return;
    }

    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    await matchLifecycleService.markSupervisorReportSubmitted(matchId, userId);

    res.json({ message: "Supervisor report marked as submitted" });
  } catch (error: any) {
    console.error("Mark supervisor report error:", error);
    res.status(500).json({ error: "Failed to mark supervisor report" });
  }
}
