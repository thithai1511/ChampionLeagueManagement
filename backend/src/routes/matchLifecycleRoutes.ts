/**
 * Match Lifecycle Routes
 * 
 * Routes for match lifecycle management
 */

import { Router } from "express";
import { requireAuth, requirePermission, requireAnyPermission } from "../middleware/authMiddleware";
import * as controller from "../controllers/matchLifecycleController";

const router = Router();

// ============================================================
// MATCH DETAILS & STATUS MANAGEMENT
// ============================================================

/**
 * GET /api/matches/:matchId/details
 * Get match details with lifecycle information
 */
router.get(
  "/matches/:matchId/details",
  requireAuth,
  controller.getMatchDetails
);

/**
 * POST /api/matches/:matchId/change-status
 * Change match status (universal status change API)
 * Body: { status, note? }
 */
router.post(
  "/matches/:matchId/change-status",
  requireAuth,
  requirePermission("manage_matches"),
  controller.changeStatus
);

/**
 * GET /api/seasons/:seasonId/matches/by-status
 * Get matches by status
 * Query: ?status=SCHEDULED|PREPARING|READY|FINISHED|REPORTED|COMPLETED
 */
router.get(
  "/seasons/:seasonId/matches/by-status",
  requireAuth,
  controller.getMatchesByStatus
);

/**
 * GET /api/seasons/:seasonId/matches/lifecycle-statistics
 * Get lifecycle statistics for a season
 */
router.get(
  "/seasons/:seasonId/matches/lifecycle-statistics",
  requireAuth,
  controller.getLifecycleStatistics
);

// ============================================================
// ADMIN ROUTES - BTC Actions
// ============================================================

/**
 * POST /api/matches/:matchId/assign-officials
 * Assign officials to a match (transitions to PREPARING)
 * Body: { mainRefereeId, assistantReferee1Id?, assistantReferee2Id?, fourthOfficialId?, supervisorId? }
 */
router.post(
  "/matches/:matchId/assign-officials",
  requireAuth,
  requirePermission("manage_matches"),
  controller.assignOfficials
);

/**
 * POST /api/matches/:matchId/lineup-status
 * Update lineup status for a team
 * Body: { teamType: "home" | "away", status: "PENDING" | "APPROVED" | "REJECTED" }
 */
router.post(
  "/matches/:matchId/lineup-status",
  requireAuth,
  requirePermission("manage_matches"),
  controller.updateLineupStatus
);

// ============================================================
// SUPERVISOR ROUTES
// ============================================================

/**
 * POST /api/matches/:matchId/supervisor-report
 * Submit supervisor report
 * Body: {
 *   organizationRating?, homeTeamRating?, awayTeamRating?,
 *   stadiumConditionRating?, securityRating?,
 *   incidentReport?, hasSeriousViolation?, sendToDisciplinary?,
 *   recommendations?
 * }
 */
router.post(
  "/matches/:matchId/supervisor-report",
  requireAuth,
  requireAnyPermission("manage_matches", "official_role"),
  controller.submitSupervisorReport
);

/**
 * GET /api/matches/:matchId/supervisor-report
 * Get supervisor report for a match
 */
router.get(
  "/matches/:matchId/supervisor-report",
  requireAuth,
  controller.getSupervisorReport
);

/**
 * GET /api/supervisor/my-reports
 * Get supervisor's own reports
 * Query: ?seasonId=1
 */
router.get(
  "/supervisor/my-reports",
  requireAuth,
  requireAnyPermission("manage_matches", "official_role"),
  controller.getMySupervisorReports
);

// ============================================================
// ADMIN ROUTES - Report Review
// ============================================================

/**
 * GET /api/admin/supervisor-reports/disciplinary
 * Get reports flagged for disciplinary review
 * Query: ?seasonId=1
 */
router.get(
  "/admin/supervisor-reports/disciplinary",
  requireAuth,
  requireAnyPermission("manage_matches", "manage_discipline"),
  controller.getDisciplinaryReports
);

/**
 * POST /api/admin/supervisor-reports/:reportId/review
 * Review supervisor report
 * Body: { notes? }
 */
router.post(
  "/admin/supervisor-reports/:reportId/review",
  requireAuth,
  requirePermission("manage_matches"),
  controller.reviewSupervisorReport
);

/**
 * GET /api/seasons/:seasonId/supervisor-reports/statistics
 * Get supervisor report statistics for a season
 */
router.get(
  "/seasons/:seasonId/supervisor-reports/statistics",
  requireAuth,
  requirePermission("manage_matches"),
  controller.getSupervisorReportStatistics
);

export default router;
