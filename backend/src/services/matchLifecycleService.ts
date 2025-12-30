/**
 * Match Lifecycle Service
 * 
 * Manages the complete lifecycle of a match from scheduling to completion:
 * SCHEDULED -> PREPARING -> READY -> FINISHED -> REPORTED -> COMPLETED
 * 
 * Key Features:
 * - State machine pattern for match status transitions
 * - Automatic notifications to relevant parties
 * - Validation and business rules enforcement
 * - Audit trail of all status changes
 */

import { query } from "../db/sqlServer";
import { NotificationService } from "./notificationService";
import * as matchOfficialService from "./matchOfficialService";
import * as matchLineupService from "./matchLineupService";
import { processMatchCompletion } from "./matchResultProcessingService";

// Match lifecycle statuses
export type MatchStatus =
  | "SCHEDULED"      // Đã lên lịch
  | "PREPARING"      // Đã phân công trọng tài, chờ lineup
  | "READY"          // Lineup đã duyệt, sẵn sàng thi đấu
  | "IN_PROGRESS"    // Đang thi đấu (optional, có thể skip)
  | "FINISHED"       // Trận đấu kết thúc
  | "REPORTED"       // Báo cáo đã nộp
  | "COMPLETED";     // BTC đã xác nhận

export interface MatchDetails {
  match_id: number;
  season_id: number;
  round_id: number;
  matchday_number: number;
  home_season_team_id: number;
  home_team_name: string;
  away_season_team_id: number;
  away_team_name: string;
  stadium_id: number;
  stadium_name?: string;
  scheduled_kickoff: string;
  status: MatchStatus;
  home_score?: number;
  away_score?: number;
  
  // Officials
  main_referee_id?: number;
  main_referee_name?: string;
  assistant_referee_1_id?: number;
  assistant_referee_2_id?: number;
  fourth_official_id?: number;
  supervisor_id?: number;
  supervisor_name?: string;
  
  // Lineup status
  home_lineup_status?: string;
  away_lineup_status?: string;
  
  // Report status
  referee_report_submitted?: boolean;
  supervisor_report_submitted?: boolean;
  
  created_at: string;
  updated_at?: string;
}

export interface AssignOfficialsInput {
  matchId: number;
  mainRefereeId: number;
  assistantReferee1Id?: number;
  assistantReferee2Id?: number;
  fourthOfficialId?: number;
  supervisorId?: number;
}

/**
 * State transition validation rules
 */
const VALID_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  SCHEDULED: ["PREPARING"],
  PREPARING: ["READY", "SCHEDULED"], // Can go back if officials removed
  READY: ["IN_PROGRESS", "FINISHED"], // Can skip IN_PROGRESS
  IN_PROGRESS: ["FINISHED"],
  FINISHED: ["REPORTED"],
  REPORTED: ["COMPLETED", "FINISHED"], // Can go back if report needs correction
  COMPLETED: [], // Terminal state
};

/**
 * Validate if a state transition is allowed
 */
function isValidTransition(fromStatus: MatchStatus, toStatus: MatchStatus): boolean {
  return VALID_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}

/**
 * Get match details
 */
export async function getMatchDetails(matchId: number): Promise<MatchDetails | null> {
  const result = await query<MatchDetails>(
    `
    SELECT 
      m.match_id,
      m.season_id,
      m.round_id,
      m.matchday_number,
      m.home_season_team_id,
      ht.name as home_team_name,
      m.away_season_team_id,
      at.name as away_team_name,
      m.stadium_id,
      s.name as stadium_name,
      CONVERT(VARCHAR(23), m.scheduled_kickoff, 126) as scheduled_kickoff,
      m.status,
      m.home_score,
      m.away_score,
      m.main_referee_id,
      ref_main.full_name as main_referee_name,
      m.assistant_referee_1_id,
      m.assistant_referee_2_id,
      m.fourth_official_id,
      m.supervisor_id,
      sup.full_name as supervisor_name,
      m.home_lineup_status,
      m.away_lineup_status,
      m.referee_report_submitted,
      m.supervisor_report_submitted,
      CONVERT(VARCHAR(23), m.created_at, 126) as created_at,
      CONVERT(VARCHAR(23), m.updated_at, 126) as updated_at
    FROM matches m
    INNER JOIN season_team_participants stp_home ON m.home_season_team_id = stp_home.season_team_id
    INNER JOIN teams ht ON stp_home.team_id = ht.team_id
    INNER JOIN season_team_participants stp_away ON m.away_season_team_id = stp_away.season_team_id
    INNER JOIN teams at ON stp_away.team_id = at.team_id
    LEFT JOIN stadiums s ON m.stadium_id = s.stadium_id
    LEFT JOIN user_accounts ref_main ON m.main_referee_id = ref_main.user_id
    LEFT JOIN user_accounts sup ON m.supervisor_id = sup.user_id
    WHERE m.match_id = @matchId
    `,
    { matchId }
  );

  return result.recordset[0] || null;
}

/**
 * Main API: Change match status
 * This is the "one-stop" function that handles all state changes
 */
export async function changeMatchStatus(
  matchId: number,
  newStatus: MatchStatus,
  payload?: {
    note?: string;
    changedBy?: number;
  }
): Promise<MatchDetails> {
  // 1. Get current match
  const match = await getMatchDetails(matchId);
  if (!match) {
    throw new Error(`Match ${matchId} not found`);
  }

  // 2. Validate transition
  if (!isValidTransition(match.status as MatchStatus, newStatus)) {
    throw new Error(
      `Invalid state transition from ${match.status} to ${newStatus}`
    );
  }

  // 3. Additional validation based on target status
  if (newStatus === "PREPARING") {
    // Must have officials assigned
    if (!match.main_referee_id) {
      throw new Error("Cannot move to PREPARING without assigning main referee");
    }
  }

  if (newStatus === "READY") {
    // Must have both lineups approved
    if (match.home_lineup_status !== "APPROVED" || match.away_lineup_status !== "APPROVED") {
      throw new Error("Cannot move to READY without both lineups approved");
    }
  }

  if (newStatus === "REPORTED") {
    // Must have both reports submitted
    if (!match.referee_report_submitted || !match.supervisor_report_submitted) {
      throw new Error("Cannot move to REPORTED without both referee and supervisor reports");
    }
  }

  // 4. Update database
  await query(
    `
    UPDATE matches
    SET status = @newStatus,
        updated_at = SYSUTCDATETIME()
    WHERE match_id = @matchId
    `,
    { matchId, newStatus }
  );

  // 5. Log status change
  await logStatusChange(
    matchId,
    match.status as MatchStatus,
    newStatus,
    payload?.changedBy,
    payload?.note
  );

  // 6. Process match completion (update standings, disciplinary, etc.)
  if (newStatus === "COMPLETED") {
    try {
      console.log(`[changeMatchStatus] Processing match completion for match ${matchId}`);
      const processingResult = await processMatchCompletion(matchId);
      if (!processingResult.success) {
        console.warn(`[changeMatchStatus] Match completion processing had errors:`, processingResult.errors);
      } else {
        console.log(`[changeMatchStatus] Match completion processed successfully`);
      }
    } catch (err) {
      console.error(`[changeMatchStatus] Error processing match completion:`, err);
      // Don't throw - we still want to complete the status change
    }
  }

  // 7. Trigger notifications
  await triggerNotification(match, newStatus, payload?.note);

  // 8. Return updated match
  return (await getMatchDetails(matchId)) as MatchDetails;
}

/**
 * Assign officials to a match
 * Automatically transitions from SCHEDULED to PREPARING
 */
export async function assignOfficials(
  input: AssignOfficialsInput,
  assignedBy?: number
): Promise<MatchDetails> {
  const { matchId, mainRefereeId, assistantReferee1Id, assistantReferee2Id, fourthOfficialId, supervisorId } = input;

  // Get current match
  const match = await getMatchDetails(matchId);
  if (!match) {
    throw new Error(`Match ${matchId} not found`);
  }

  // Can only assign when SCHEDULED
  if (match.status !== "SCHEDULED") {
    throw new Error(`Can only assign officials when match is SCHEDULED (current: ${match.status})`);
  }

  // Use matchOfficialService to assign officials (normalized table)
  // assignOfficialToMatch requires: matchId, officialId, role, assignedByUserId
  const assigner = assignedBy || 1; // Default to system user if not provided
  
  await matchOfficialService.assignOfficialToMatch(matchId, mainRefereeId, 'referee', assigner);
  
  if (assistantReferee1Id) {
    await matchOfficialService.assignOfficialToMatch(matchId, assistantReferee1Id, 'assistant_1', assigner);
  }
  if (assistantReferee2Id) {
    await matchOfficialService.assignOfficialToMatch(matchId, assistantReferee2Id, 'assistant_2', assigner);
  }
  if (fourthOfficialId) {
    await matchOfficialService.assignOfficialToMatch(matchId, fourthOfficialId, 'fourth_official', assigner);
  }
  // Note: Supervisor is stored directly in matches table, not in match_official_assignments
  if (supervisorId) {
    await query(
      `UPDATE matches SET supervisor_id = @supervisorId WHERE match_id = @matchId`,
      { matchId, supervisorId }
    );
  }

  // Update officials_assigned_at timestamp
  await query(
    `UPDATE matches SET officials_assigned_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME() WHERE match_id = @matchId`,
    { matchId }
  );

  // Transition to PREPARING
  return await changeMatchStatus(matchId, "PREPARING", {
    note: "Officials assigned",
    changedBy: assignedBy,
  });
}

/**
 * Update lineup status for a team
 * Automatically transitions to READY when both teams approved
 */
export async function updateLineupStatus(
  matchId: number,
  teamType: "home" | "away",
  status: "PENDING" | "APPROVED" | "REJECTED",
  reviewedBy?: number,
  rejectionReason?: string
): Promise<MatchDetails> {
  const match = await getMatchDetails(matchId);
  if (!match) {
    throw new Error(`Match ${matchId} not found`);
  }

  if (!reviewedBy) {
    throw new Error('reviewedBy is required for lineup status update');
  }

  // Use matchLineupService for approval/rejection
  if (status === "APPROVED") {
    await matchLineupService.approveLineup(matchId, teamType, reviewedBy);
  } else if (status === "REJECTED") {
    await matchLineupService.rejectLineup(matchId, teamType, rejectionReason || 'No reason provided', reviewedBy);
  }

  // Get updated match details
  const updatedMatch = await getMatchDetails(matchId);
  return updatedMatch as MatchDetails;
}

/**
 * Mark referee report as submitted
 */
export async function markRefereeReportSubmitted(
  matchId: number,
  refereeId: number
): Promise<void> {
  await query(
    `
    UPDATE matches
    SET referee_report_submitted = 1,
        updated_at = SYSUTCDATETIME()
    WHERE match_id = @matchId
    AND main_referee_id = @refereeId
    `,
    { matchId, refereeId }
  );

  // Check if both reports submitted
  await checkAndTransitionToReported(matchId);
}

/**
 * Mark supervisor report as submitted
 */
export async function markSupervisorReportSubmitted(
  matchId: number,
  supervisorId: number
): Promise<void> {
  await query(
    `
    UPDATE matches
    SET supervisor_report_submitted = 1,
        updated_at = SYSUTCDATETIME()
    WHERE match_id = @matchId
    AND supervisor_id = @supervisorId
    `,
    { matchId, supervisorId }
  );

  // Check if both reports submitted
  await checkAndTransitionToReported(matchId);
}

/**
 * Check if both reports are submitted and transition to REPORTED
 */
async function checkAndTransitionToReported(matchId: number): Promise<void> {
  const match = await getMatchDetails(matchId);
  
  if (
    match &&
    match.referee_report_submitted &&
    match.supervisor_report_submitted &&
    match.status === "FINISHED"
  ) {
    await changeMatchStatus(matchId, "REPORTED", {
      note: "Both reports submitted",
    });
  }
}

/**
 * Log status change to audit table
 */
async function logStatusChange(
  matchId: number,
  fromStatus: MatchStatus,
  toStatus: MatchStatus,
  changedBy?: number,
  note?: string
): Promise<void> {
  await query(
    `
    INSERT INTO match_lifecycle_history (
      match_id,
      from_status,
      to_status,
      changed_by,
      note
    )
    VALUES (
      @matchId,
      @fromStatus,
      @toStatus,
      @changedBy,
      @note
    )
    `,
    {
      matchId,
      fromStatus,
      toStatus,
      changedBy: changedBy || null,
      note: note || null,
    }
  );
}

/**
 * Trigger notifications based on status change
 */
async function triggerNotification(
  match: MatchDetails,
  newStatus: MatchStatus,
  note?: string
): Promise<void> {
  switch (newStatus) {
    case "PREPARING":
      // Notify team admins to submit lineup
      await notifyTeamAdmins(match, "lineup_required");
      
      // Notify officials about assignment
      if (match.main_referee_id) {
        await NotificationService.createNotification({
          userId: match.main_referee_id,
          type: "official_assignment",
          title: `Phân công trọng tài`,
          message: `Bạn được phân công làm trọng tài chính trận ${match.home_team_name} vs ${match.away_team_name}`,
          relatedEntity: "match",
          relatedId: match.match_id,
          actionUrl: `/official/match/${match.match_id}`,
        });
      }
      
      if (match.supervisor_id) {
        await NotificationService.createNotification({
          userId: match.supervisor_id,
          type: "official_assignment",
          title: `Phân công giám sát`,
          message: `Bạn được phân công giám sát trận ${match.home_team_name} vs ${match.away_team_name}`,
          relatedEntity: "match",
          relatedId: match.match_id,
          actionUrl: `/official/match/${match.match_id}/supervisor-report`,
        });
      }
      break;

    case "READY":
      // Notify officials that match is ready
      if (match.main_referee_id) {
        await NotificationService.createNotification({
          userId: match.main_referee_id,
          type: "match_ready",
          title: `Trận đấu sẵn sàng`,
          message: `Trận ${match.home_team_name} vs ${match.away_team_name} đã có đủ lineup. Sẵn sàng thi đấu.`,
          relatedEntity: "match",
          relatedId: match.match_id,
        });
      }
      break;

    case "FINISHED":
      // Notify officials to submit reports
      if (match.main_referee_id) {
        await NotificationService.createNotification({
          userId: match.main_referee_id,
          type: "report_required",
          title: `Yêu cầu báo cáo trận đấu`,
          message: `Vui lòng nộp báo cáo cho trận ${match.home_team_name} vs ${match.away_team_name}`,
          relatedEntity: "match",
          relatedId: match.match_id,
          actionUrl: `/official/match/${match.match_id}/report`,
        });
      }
      
      if (match.supervisor_id) {
        await NotificationService.createNotification({
          userId: match.supervisor_id,
          type: "report_required",
          title: `Yêu cầu báo cáo giám sát`,
          message: `Vui lòng nộp báo cáo giám sát cho trận ${match.home_team_name} vs ${match.away_team_name}`,
          relatedEntity: "match",
          relatedId: match.match_id,
          actionUrl: `/official/match/${match.match_id}/supervisor-report`,
        });
      }
      break;

    case "REPORTED":
      // Notify BTC to review and confirm
      const btcAdmins = await query<{ user_id: number }>(
        `SELECT user_id FROM user_accounts WHERE role = 'admin' AND status = 'active'`
      );
      
      for (const admin of btcAdmins.recordset) {
        await NotificationService.createNotification({
          userId: admin.user_id,
          type: "match_report_review",
          title: `Báo cáo trận đấu cần xác nhận`,
          message: `Trận ${match.home_team_name} vs ${match.away_team_name} đã có báo cáo. Vui lòng xác nhận.`,
          relatedEntity: "match",
          relatedId: match.match_id,
          actionUrl: `/admin/match/${match.match_id}/reports`,
        });
      }
      break;

    case "COMPLETED":
      // Notify teams about final result
      await notifyTeamAdmins(match, "match_completed");
      break;
  }
}

/**
 * Notify team admins
 */
async function notifyTeamAdmins(
  match: MatchDetails,
  notificationType: "lineup_required" | "lineup_approved" | "lineup_rejected" | "match_completed"
): Promise<void> {
  // Get team admins
  const teamAdmins = await query<{ user_id: number; team_id: number }>(
    `
    SELECT DISTINCT uta.user_id, stp.team_id
    FROM user_team_assignments uta
    INNER JOIN season_team_participants stp ON uta.team_id = stp.team_id
    WHERE stp.season_team_id IN (@homeTeamId, @awayTeamId)
    AND uta.role = 'admin'
    `,
    { homeTeamId: match.home_season_team_id, awayTeamId: match.away_season_team_id }
  );

  for (const admin of teamAdmins.recordset) {
    let title = "";
    let message = "";
    let actionUrl = "";

    switch (notificationType) {
      case "lineup_required":
        title = "Yêu cầu nộp danh sách thi đấu";
        message = `Trận ${match.home_team_name} vs ${match.away_team_name} đã có trọng tài. Vui lòng nộp danh sách thi đấu.`;
        actionUrl = `/team/match/${match.match_id}/lineup`;
        break;
      
      case "lineup_approved":
        title = "Danh sách thi đấu đã được duyệt";
        message = `Danh sách thi đấu cho trận ${match.home_team_name} vs ${match.away_team_name} đã được BTC duyệt.`;
        break;
      
      case "lineup_rejected":
        title = "Danh sách thi đấu cần chỉnh sửa";
        message = `Danh sách thi đấu cho trận ${match.home_team_name} vs ${match.away_team_name} cần chỉnh sửa.`;
        actionUrl = `/team/match/${match.match_id}/lineup`;
        break;
      
      case "match_completed":
        title = "Trận đấu đã hoàn tất";
        message = `Kết quả trận ${match.home_team_name} ${match.home_score || 0} - ${match.away_score || 0} ${match.away_team_name} đã được xác nhận.`;
        break;
    }

    await NotificationService.createNotification({
      userId: admin.user_id,
      type: notificationType,
      title,
      message,
      relatedEntity: "match",
      relatedId: match.match_id,
      actionUrl: actionUrl || undefined,
    });
  }
}

/**
 * Get matches by status
 */
export async function getMatchesByStatus(
  seasonId: number,
  status: MatchStatus
): Promise<MatchDetails[]> {
  const result = await query<MatchDetails>(
    `
    SELECT 
      m.match_id,
      m.season_id,
      m.home_season_team_id,
      ht.name as home_team_name,
      m.away_season_team_id,
      at.name as away_team_name,
      CONVERT(VARCHAR(23), m.scheduled_kickoff, 126) as scheduled_kickoff,
      m.status,
      m.home_lineup_status,
      m.away_lineup_status,
      m.referee_report_submitted,
      m.supervisor_report_submitted
    FROM matches m
    INNER JOIN season_team_participants stp_home ON m.home_season_team_id = stp_home.season_team_id
    INNER JOIN teams ht ON stp_home.team_id = ht.team_id
    INNER JOIN season_team_participants stp_away ON m.away_season_team_id = stp_away.season_team_id
    INNER JOIN teams at ON stp_away.team_id = at.team_id
    WHERE m.season_id = @seasonId
    AND m.status = @status
    ORDER BY m.scheduled_kickoff ASC
    `,
    { seasonId, status }
  );

  return result.recordset;
}

/**
 * Get lifecycle statistics for a season
 */
export async function getLifecycleStatistics(seasonId: number): Promise<{
  [key in MatchStatus]?: number;
}> {
  const result = await query<{ status: MatchStatus; cnt: number }>(
    `
    SELECT status, COUNT(*) as cnt
    FROM matches
    WHERE season_id = @seasonId
    GROUP BY status
    `,
    { seasonId }
  );

  const stats: { [key in MatchStatus]?: number } = {};
  for (const row of result.recordset) {
    stats[row.status] = row.cnt;
  }

  return stats;
}

