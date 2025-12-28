import { Router } from "express";
import { z } from "zod";
import { requireAnyPermission, requireAuth } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { query } from "../db/sqlServer";
import {
  createSeason,
  deleteSeason,
  getSeasonById,
  listSeasonMetadata,
  listSeasons,
  updateSeason,
} from "../services/seasonService";
import { AuthenticatedRequest } from "../types";
import { query } from "../db/sqlServer";

const router = Router();
const requireSeasonManagement = requireAnyPermission("manage_rulesets", "manage_teams");

/* ===================== SCHEMAS ===================== */

const seasonStatusSchema = z.union([
  z.literal("draft"),
  z.literal("inviting"),
  z.literal("registering"),
  z.literal("scheduled"),
  z.literal("in_progress"),
  z.literal("completed"),
  z.literal("archived"),
]);

const seasonBaseSchema = z.object({
  tournamentId: z.number().int().positive(),
  rulesetId: z.number().int().positive(),
  name: z.string().min(3),
  code: z.string().min(2),
  status: seasonStatusSchema,
  startDate: z.string().min(1),
  endDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  participationFee: z.number().min(0).optional(),
  invitationOpenedAt: z.string().optional().nullable(),
  registrationDeadline: z.string().optional().nullable(),
  maxTeams: z.number().int().min(1).max(64).optional(),
  expectedRounds: z.number().int().min(1).max(60).optional(),
});

/* ===================== ROUTES ===================== */

/**
 * GET /api/seasons/:id/teams
 * 👉 FE dropdown chọn đội
 */
router.get(
  "/:id/teams",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    res.setHeader('Cache-Control', 'no-store')

    const seasonId = Number(req.params.id)
    
    // Check if user has restricted team access
    const userTeamIds = req.user?.teamIds
    const isSuperAdmin = req.user?.roles?.includes('super_admin')
    const hasManageTeams = req.user?.permissions?.includes('manage_teams')
    
    // Super admin and users with manage_teams permission see all teams
    const canSeeAllTeams = isSuperAdmin || hasManageTeams
    
    let whereClause = 'WHERE stp.season_id = @seasonId'
    const params: Record<string, any> = { seasonId }
    
    // If user is restricted to specific teams, filter results
    if (!canSeeAllTeams && Array.isArray(userTeamIds) && userTeamIds.length > 0) {
      const teamIdPlaceholders = userTeamIds.map((_, i) => `@teamId${i}`).join(',')
      whereClause += ` AND t.team_id IN (${teamIdPlaceholders})`
      userTeamIds.forEach((id, i) => {
        params[`teamId${i}`] = id
      })
    } else if (!canSeeAllTeams && (!userTeamIds || userTeamIds.length === 0)) {
      // User has no teams assigned and is not admin - return empty
      return res.json([])
    }

    const result = await query(`
      SELECT
        stp.season_team_id,
        stp.season_id,
        t.team_id,
        t.name AS team_name
      FROM season_team_participants stp
      JOIN teams t ON stp.team_id = t.team_id
      ${whereClause}
      ORDER BY t.name
    `, params)

    res.json(
      result.recordset.map(r => ({
        id: r.season_team_id,
        name: r.team_name,
        team_id: r.team_id
      }))
    )
  }
)


/**
 * GET /api/seasons
 */
router.get(
  "/",
  requireAuth,
  requireAuth,
  // Allow all authenticated users to list seasons (needed for Team Admin My Team page)
  async (_req, res) => {
    const seasons = await listSeasons();
    res.json(seasons);
  }
);

/**
 * GET /api/seasons/metadata
 */
router.get(
  "/metadata",
  requireAuth,
  requireSeasonManagement,
  async (_req, res) => {
    const metadata = await listSeasonMetadata();
    res.json(metadata);
  }
);

/**
 * GET /api/seasons/:id
 */
router.get(
  "/:id",
  requireAuth,
  requireSeasonManagement,
  async (req, res) => {
    const season = await getSeasonById(Number(req.params.id));
    if (!season) {
      return res.status(404).json({ error: "Season not found" });
    }
    res.json(season);
  }
);

/**
 * POST /api/seasons
 */
router.post(
  "/",
  requireAuth,
  requireSeasonManagement,
  validate({ schema: seasonBaseSchema }),
  async (req: AuthenticatedRequest, res) => {
    const season = await createSeason({
      ...req.body,
      endDate: req.body.endDate || null,
      description: req.body.description || null,
      participationFee: req.body.participationFee ?? 0,
      invitationOpenedAt: req.body.invitationOpenedAt || null,
      registrationDeadline: req.body.registrationDeadline || null,
      actorId: req.user!.sub,
    });
    res.status(201).json(season);
  }
);

/**
 * PUT /api/seasons/:id
 */
router.put(
  "/:id",
  requireAuth,
  requireSeasonManagement,
  validate({ schema: seasonBaseSchema }),
  async (req: AuthenticatedRequest, res) => {
    const seasonId = Number(req.params.id);
    const season = await updateSeason(seasonId, {
      ...req.body,
      endDate: req.body.endDate || null,
      description: req.body.description || null,
      participationFee: req.body.participationFee ?? 0,
      invitationOpenedAt: req.body.invitationOpenedAt || null,
      registrationDeadline: req.body.registrationDeadline || null,
      actorId: req.user!.sub,
    });
    res.json(season);
  }
);

/**
 * DELETE /api/seasons/:id
 */
router.delete(
  "/:id",
  requireAuth,
  requireSeasonManagement,
  async (req, res) => {
    const seasonId = Number(req.params.id);
    if (Number.isNaN(seasonId)) {
      return res.status(400).json({ error: "Invalid season id" });
    }
    try {
      const deleted = await deleteSeason(seasonId);
      if (!deleted) {
        return res.status(404).json({ error: "Season not found" });
      }
      res.status(204).send();
    } catch (err: any) {
      console.error("Delete Season Error:", err);
      // Log to file for debugging agent to see

      res.status(500).json({ error: "Failed to delete season", details: err.message });
    }
  }
);

/**
 * GET /seasons/:id/participants
 * Get all teams participating in a season
 */
router.get(
  "/:id/participants",
  requireAuth,
  requireSeasonManagement,
  async (req, res) => {
    const seasonId = Number(req.params.id);
    if (Number.isNaN(seasonId)) {
      return res.status(400).json({ error: "Invalid season id" });
    }

    const result = await query<{
      season_team_id: number;
      team_id: number;
      team_name: string;
      short_name: string | null;
      status: string;
    }>(
      `SELECT 
        stp.season_team_id,
        stp.team_id,
        t.name AS team_name,
        t.short_name,
        stp.status
       FROM season_team_participants stp
       INNER JOIN teams t ON stp.team_id = t.team_id
       WHERE stp.season_id = @seasonId
       ORDER BY t.name`,
      { seasonId }
    );

    res.json({ data: result.recordset });
  }
);

/**
 * POST /seasons/:id/participants
 * Add a team to a season
 */
const addTeamSchema = z.object({
  teamId: z.number().int().positive(),
  status: z.enum(["pending", "active", "eliminated", "withdrawn"]).optional().default("active"),
});

router.post(
  "/:id/participants",
  requireAuth,
  requireSeasonManagement,
  validate({ schema: addTeamSchema }),
  async (req, res) => {
    const seasonId = Number(req.params.id);
    if (Number.isNaN(seasonId)) {
      return res.status(400).json({ error: "Invalid season id" });
    }

    const { teamId, status } = req.body;

    // Check if team already in season
    const existing = await query<{ season_team_id: number }>(
      `SELECT season_team_id FROM season_team_participants 
       WHERE season_id = @seasonId AND team_id = @teamId`,
      { seasonId, teamId }
    );

    if (existing.recordset.length > 0) {
      return res.status(400).json({
        error: "Team already participating in this season",
        seasonTeamId: existing.recordset[0].season_team_id
      });
    }

    // Add team to season
    const result = await query<{ season_team_id: number }>(
      `INSERT INTO season_team_participants (season_id, team_id, status)
       OUTPUT INSERTED.season_team_id
       VALUES (@seasonId, @teamId, @status)`,
      { seasonId, teamId, status }
    );

    res.status(201).json({
      success: true,
      message: "Team added to season successfully",
      data: { seasonTeamId: result.recordset[0].season_team_id }
    });
  }
);

/**
 * POST /seasons/:id/participants/bulk
 * Add multiple teams to a season
 */
const bulkAddTeamsSchema = z.object({
  teamIds: z.array(z.number().int().positive()).min(1),
  status: z.enum(["pending", "active", "eliminated", "withdrawn"]).optional().default("active"),
});

router.post(
  "/:id/participants/bulk",
  requireAuth,
  requireSeasonManagement,
  validate({ schema: bulkAddTeamsSchema }),
  async (req, res) => {
    const seasonId = Number(req.params.id);
    if (Number.isNaN(seasonId)) {
      return res.status(400).json({ error: "Invalid season id" });
    }

    const { teamIds, status } = req.body;
    let addedCount = 0;
    const results: { teamId: number; seasonTeamId: number | null; error?: string }[] = [];

    for (const teamId of teamIds) {
      try {
        // Check if already exists
        const existing = await query<{ season_team_id: number }>(
          `SELECT season_team_id FROM season_team_participants 
           WHERE season_id = @seasonId AND team_id = @teamId`,
          { seasonId, teamId }
        );

        if (existing.recordset.length > 0) {
          results.push({
            teamId,
            seasonTeamId: existing.recordset[0].season_team_id,
            error: "Already exists"
          });
          continue;
        }

        // Add team
        const result = await query<{ season_team_id: number }>(
          `INSERT INTO season_team_participants (season_id, team_id, status)
           OUTPUT INSERTED.season_team_id
           VALUES (@seasonId, @teamId, @status)`,
          { seasonId, teamId, status }
        );

        results.push({ teamId, seasonTeamId: result.recordset[0].season_team_id });
        addedCount++;
      } catch (err) {
        results.push({ teamId, seasonTeamId: null, error: String(err) });
      }
    }

    res.json({
      success: true,
      message: `Added ${addedCount} teams to season`,
      data: { addedCount, results }
    });
  }
);

/**
 * DELETE /seasons/:seasonId/participants/:teamId
 * Remove a team from a season
 */
router.delete(
  "/:seasonId/participants/:teamId",
  requireAuth,
  requireSeasonManagement,
  async (req, res) => {
    const seasonId = Number(req.params.seasonId);
    const teamId = Number(req.params.teamId);

    if (Number.isNaN(seasonId) || Number.isNaN(teamId)) {
      return res.status(400).json({ error: "Invalid season or team id" });
    }

    const result = await query(
      `DELETE FROM season_team_participants 
       WHERE season_id = @seasonId AND team_id = @teamId`,
      { seasonId, teamId }
    );

    const deleted = (result.rowsAffected?.[0] ?? 0) > 0;

    if (!deleted) {
      return res.status(404).json({ error: "Team not found in this season" });
    }

    res.json({ success: true, message: "Team removed from season" });
  }
);

export default router;

