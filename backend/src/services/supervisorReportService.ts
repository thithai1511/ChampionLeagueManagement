/**
 * Supervisor Report Service
 * 
 * Manages supervisor reports for matches including:
 * - Organization ratings
 * - Incident reporting
 * - Disciplinary flagging
 * - Report submission and review
 */

import { query } from "../db/sqlServer";
import * as matchLifecycleService from "./matchLifecycleService";
import { NotificationService } from "./notificationService";

export interface SupervisorReport {
  report_id: number;
  match_id: number;
  supervisor_id: number;
  supervisor_name?: string;
  organization_rating?: number;
  home_team_rating?: number;
  away_team_rating?: number;
  stadium_condition_rating?: number;
  security_rating?: number;
  incident_report?: string;
  has_serious_violation: boolean;
  send_to_disciplinary: boolean;
  recommendations?: string;
  submitted_at: string;
  reviewed_by?: number;
  reviewed_at?: string;
}

export interface CreateSupervisorReportInput {
  matchId: number;
  supervisorId: number;
  organizationRating?: number;
  homeTeamRating?: number;
  awayTeamRating?: number;
  stadiumConditionRating?: number;
  securityRating?: number;
  incidentReport?: string;
  hasSeriousViolation?: boolean;
  sendToDisciplinary?: boolean;
  recommendations?: string;
}

/**
 * Create or update supervisor report
 */
export async function createSupervisorReport(
  input: CreateSupervisorReportInput
): Promise<SupervisorReport> {
  const {
    matchId,
    supervisorId,
    organizationRating,
    homeTeamRating,
    awayTeamRating,
    stadiumConditionRating,
    securityRating,
    incidentReport,
    hasSeriousViolation,
    sendToDisciplinary,
    recommendations,
  } = input;

  // Check if match exists and supervisor is assigned
  const match = await matchLifecycleService.getMatchDetails(matchId);
  if (!match) {
    throw new Error("Match not found");
  }

  if (match.supervisor_id !== supervisorId) {
    throw new Error("User is not the assigned supervisor for this match");
  }

  // Check if match is in valid status for reporting
  if (match.status !== "FINISHED" && match.status !== "REPORTED") {
    throw new Error(`Cannot submit report when match status is ${match.status}`);
  }

  // Check if report already exists
  const existing = await getSupervisorReport(matchId);
  
  if (existing) {
    // Update existing report
    await query(
      `
      UPDATE supervisor_reports
      SET organization_rating = @organizationRating,
          home_team_rating = @homeTeamRating,
          away_team_rating = @awayTeamRating,
          stadium_condition_rating = @stadiumConditionRating,
          security_rating = @securityRating,
          incident_report = @incidentReport,
          has_serious_violation = @hasSeriousViolation,
          send_to_disciplinary = @sendToDisciplinary,
          recommendations = @recommendations,
          submitted_at = SYSUTCDATETIME()
      WHERE match_id = @matchId
      `,
      {
        matchId,
        organizationRating: organizationRating || null,
        homeTeamRating: homeTeamRating || null,
        awayTeamRating: awayTeamRating || null,
        stadiumConditionRating: stadiumConditionRating || null,
        securityRating: securityRating || null,
        incidentReport: incidentReport || null,
        hasSeriousViolation: hasSeriousViolation || false,
        sendToDisciplinary: sendToDisciplinary || false,
        recommendations: recommendations || null,
      }
    );
  } else {
    // Create new report
    await query(
      `
      INSERT INTO supervisor_reports (
        match_id,
        supervisor_id,
        organization_rating,
        home_team_rating,
        away_team_rating,
        stadium_condition_rating,
        security_rating,
        incident_report,
        has_serious_violation,
        send_to_disciplinary,
        recommendations
      )
      VALUES (
        @matchId,
        @supervisorId,
        @organizationRating,
        @homeTeamRating,
        @awayTeamRating,
        @stadiumConditionRating,
        @securityRating,
        @incidentReport,
        @hasSeriousViolation,
        @sendToDisciplinary,
        @recommendations
      )
      `,
      {
        matchId,
        supervisorId,
        organizationRating: organizationRating || null,
        homeTeamRating: homeTeamRating || null,
        awayTeamRating: awayTeamRating || null,
        stadiumConditionRating: stadiumConditionRating || null,
        securityRating: securityRating || null,
        incidentReport: incidentReport || null,
        hasSeriousViolation: hasSeriousViolation || false,
        sendToDisciplinary: sendToDisciplinary || false,
        recommendations: recommendations || null,
      }
    );
  }

  // Mark supervisor report as submitted in match table
  await matchLifecycleService.markSupervisorReportSubmitted(matchId, supervisorId);

  // If flagged for disciplinary, notify disciplinary committee
  if (sendToDisciplinary) {
    await notifyDisciplinaryCommittee(match, incidentReport);
  }

  return (await getSupervisorReport(matchId)) as SupervisorReport;
}

/**
 * Get supervisor report for a match
 */
export async function getSupervisorReport(matchId: number): Promise<SupervisorReport | null> {
  const result = await query<SupervisorReport>(
    `
    SELECT 
      sr.report_id,
      sr.match_id,
      sr.supervisor_id,
      u.full_name as supervisor_name,
      sr.organization_rating,
      sr.home_team_rating,
      sr.away_team_rating,
      sr.stadium_condition_rating,
      sr.security_rating,
      sr.incident_report,
      sr.has_serious_violation,
      sr.send_to_disciplinary,
      sr.recommendations,
      CONVERT(VARCHAR(23), sr.submitted_at, 126) as submitted_at,
      sr.reviewed_by,
      CONVERT(VARCHAR(23), sr.reviewed_at, 126) as reviewed_at
    FROM supervisor_reports sr
    LEFT JOIN user_accounts u ON sr.supervisor_id = u.user_id
    WHERE sr.match_id = @matchId
    `,
    { matchId }
  );

  return result.recordset[0] || null;
}

/**
 * Get all reports that need disciplinary review
 */
export async function getReportsForDisciplinaryReview(
  seasonId?: number
): Promise<SupervisorReport[]> {
  let sql = `
    SELECT 
      sr.report_id,
      sr.match_id,
      sr.supervisor_id,
      u.full_name as supervisor_name,
      sr.organization_rating,
      sr.home_team_rating,
      sr.away_team_rating,
      sr.stadium_condition_rating,
      sr.security_rating,
      sr.incident_report,
      sr.has_serious_violation,
      sr.send_to_disciplinary,
      sr.recommendations,
      CONVERT(VARCHAR(23), sr.submitted_at, 126) as submitted_at,
      sr.reviewed_by,
      CONVERT(VARCHAR(23), sr.reviewed_at, 126) as reviewed_at
    FROM supervisor_reports sr
    LEFT JOIN user_accounts u ON sr.supervisor_id = u.user_id
    INNER JOIN matches m ON sr.match_id = m.match_id
    WHERE sr.send_to_disciplinary = 1
  `;

  const params: any = {};

  if (seasonId) {
    sql += " AND m.season_id = @seasonId";
    params.seasonId = seasonId;
  }

  sql += " ORDER BY sr.submitted_at DESC";

  const result = await query<SupervisorReport>(sql, params);
  return result.recordset;
}

/**
 * Review supervisor report (BTC)
 */
export async function reviewSupervisorReport(
  reportId: number,
  reviewedBy: number,
  notes?: string
): Promise<void> {
  await query(
    `
    UPDATE supervisor_reports
    SET reviewed_by = @reviewedBy,
        reviewed_at = SYSUTCDATETIME(),
        recommendations = CASE 
          WHEN @notes IS NOT NULL 
          THEN CONCAT(ISNULL(recommendations, ''), CHAR(13) + CHAR(10) + 'BTC Review: ', @notes)
          ELSE recommendations
        END
    WHERE report_id = @reportId
    `,
    { reportId, reviewedBy, notes: notes || null }
  );
}

/**
 * Notify disciplinary committee about serious violations
 */
async function notifyDisciplinaryCommittee(
  match: any,
  incidentReport?: string
): Promise<void> {
  // Get disciplinary committee members (users with specific permission)
  const committee = await query<{ user_id: number }>(
    `
    SELECT DISTINCT ur.user_id
    FROM user_role_assignments ur
    INNER JOIN role_permission_assignments rp ON ur.role_id = rp.role_id
    INNER JOIN permissions p ON rp.permission_id = p.permission_id
    WHERE p.code = 'manage_discipline'
    AND ur.user_id IN (SELECT user_id FROM user_accounts WHERE status = 'active')
    `
  );

  for (const member of committee.recordset) {
    await NotificationService.createNotification({
      userId: member.user_id,
      type: "disciplinary_review",
      title: `⚠️ Vi phạm nghiêm trọng cần xử lý`,
      message: `Trận ${match.home_team_name} vs ${match.away_team_name} có vi phạm nghiêm trọng. ${incidentReport ? `Chi tiết: ${incidentReport.substring(0, 100)}...` : ""}`,
      relatedEntity: "match",
      relatedId: match.match_id,
      actionUrl: `/admin/discipline/match/${match.match_id}`,
    });
  }
}

/**
 * Get supervisor reports by supervisor ID
 */
export async function getSupervisorReportsBySupervisor(
  supervisorId: number,
  seasonId?: number
): Promise<SupervisorReport[]> {
  let sql = `
    SELECT 
      sr.report_id,
      sr.match_id,
      sr.supervisor_id,
      u.full_name as supervisor_name,
      sr.organization_rating,
      sr.home_team_rating,
      sr.away_team_rating,
      sr.stadium_condition_rating,
      sr.security_rating,
      sr.incident_report,
      sr.has_serious_violation,
      sr.send_to_disciplinary,
      sr.recommendations,
      CONVERT(VARCHAR(23), sr.submitted_at, 126) as submitted_at,
      sr.reviewed_by,
      CONVERT(VARCHAR(23), sr.reviewed_at, 126) as reviewed_at
    FROM supervisor_reports sr
    LEFT JOIN user_accounts u ON sr.supervisor_id = u.user_id
    INNER JOIN matches m ON sr.match_id = m.match_id
    WHERE sr.supervisor_id = @supervisorId
  `;

  const params: any = { supervisorId };

  if (seasonId) {
    sql += " AND m.season_id = @seasonId";
    params.seasonId = seasonId;
  }

  sql += " ORDER BY sr.submitted_at DESC";

  const result = await query<SupervisorReport>(sql, params);
  return result.recordset;
}

/**
 * Get statistics for supervisor reports in a season
 */
export async function getSupervisorReportStatistics(seasonId: number): Promise<{
  totalReports: number;
  avgOrganizationRating: number;
  avgStadiumRating: number;
  avgSecurityRating: number;
  seriousViolations: number;
  disciplinaryReviews: number;
}> {
  const result = await query<{
    total_reports: number;
    avg_organization: number;
    avg_stadium: number;
    avg_security: number;
    serious_violations: number;
    disciplinary_reviews: number;
  }>(
    `
    SELECT 
      COUNT(*) as total_reports,
      AVG(CAST(organization_rating AS FLOAT)) as avg_organization,
      AVG(CAST(stadium_condition_rating AS FLOAT)) as avg_stadium,
      AVG(CAST(security_rating AS FLOAT)) as avg_security,
      SUM(CASE WHEN has_serious_violation = 1 THEN 1 ELSE 0 END) as serious_violations,
      SUM(CASE WHEN send_to_disciplinary = 1 THEN 1 ELSE 0 END) as disciplinary_reviews
    FROM supervisor_reports sr
    INNER JOIN matches m ON sr.match_id = m.match_id
    WHERE m.season_id = @seasonId
    `,
    { seasonId }
  );

  const row = result.recordset[0];

  return {
    totalReports: row?.total_reports || 0,
    avgOrganizationRating: row?.avg_organization || 0,
    avgStadiumRating: row?.avg_stadium || 0,
    avgSecurityRating: row?.avg_security || 0,
    seriousViolations: row?.serious_violations || 0,
    disciplinaryReviews: row?.disciplinary_reviews || 0,
  };
}

