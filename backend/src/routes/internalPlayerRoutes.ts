import { Router } from "express";
import { query } from "../db/sqlServer";
import { createPlayerHandler } from "../controllers/internalPlayerController";
import { requireAnyPermission, requireAuth, requirePermission, requireTeamOwnership } from "../middleware/authMiddleware";
import { AuthenticatedRequest } from "../types";
import { getOrFetchPlayerAvatar, batchFetchPlayerAvatars } from "../services/playerAvatarService";

const router = Router();
const requireTeamOwnershipCheck = [requireAuth, requireTeamOwnership] as const;

/**
 * Middleware to check if player belongs to managed team
 */
async function checkPlayerTeamOwnership(req: AuthenticatedRequest, _res: any, next: any) {
  // Global admins bypass
  if (req.user?.permissions?.includes("manage_teams")) {
    next();
    return;
  }

  const playerId = parseInt(req.params.id, 10);
  if (isNaN(playerId)) {
    return _res.status(400).json({ error: "Invalid player ID" });
  }

  const managedTeamId = (req.user as any).managed_team_id;
  if (!managedTeamId) {
    return _res.status(403).json({ error: "You don't have a managed team" });
  }

  // Get player's current team
  const result = await query<{ current_team_id: number | null }>(
    `SELECT current_team_id FROM players WHERE player_id = @playerId;`,
    { playerId }
  );

  const player = result.recordset[0];
  if (!player || player.current_team_id !== managedTeamId) {
    return _res.status(403).json({ error: "This player does not belong to your managed team" });
  }

  next();
}

/**
 * POST /internal/players - Create a new player
 * Handled by controller, verified in service.
 */
router.post("/", requireAuth, requireAnyPermission("manage_own_player_registrations", "manage_teams"), createPlayerHandler);


router.get("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const teamId = typeof req.query.teamId === "string" ? parseInt(req.query.teamId, 10) : null;
    const page = typeof req.query.page === "string" ? parseInt(req.query.page, 10) : 1;
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 25;
    const offset = (page - 1) * limit;

    const conditions: string[] = ["1=1"];
    const params: Record<string, unknown> = { offset, limit };

    // Check permissions
    const isSuperAdmin = req.user?.roles?.includes('super_admin');
    const hasManageTeams = req.user?.permissions?.includes("manage_teams");
    const canSeeAll = isSuperAdmin || hasManageTeams;
    
    console.log('[GET /api/players] User:', {
      roles: req.user?.roles,
      permissions: req.user?.permissions,
      teamIds: req.user?.teamIds,
      isSuperAdmin,
      hasManageTeams,
      canSeeAll
    });
    
    // Team admin: only see players from their assigned teams
    const userTeamIds = req.user?.teamIds || [];
    
    if (!canSeeAll && userTeamIds.length > 0) {
      // Team admin can only see their teams' players
      const teamIdPlaceholders = userTeamIds.map((_, i) => `@userTeamId${i}`).join(',');
      conditions.push(`current_team_id IN (${teamIdPlaceholders})`);
      userTeamIds.forEach((id, i) => {
        params[`userTeamId${i}`] = id;
      });
      console.log('[GET /api/players] Team admin filter applied:', userTeamIds);
    } else if (!canSeeAll) {
      // User has no teams assigned and is not admin - return empty
      console.log('[GET /api/players] No permissions, returning empty');
      return res.json({
        data: [],
        total: 0,
        pagination: { page, limit, totalPages: 0 }
      });
    } else {
      console.log('[GET /api/players] Super admin or manage_teams, showing all players');
    }
    
    // Optional filter by team (for super admin and admin with manage_teams)
    if (canSeeAll && teamId && !isNaN(teamId)) {
      conditions.push("current_team_id = @teamId");
      params.teamId = teamId;
      console.log('[GET /api/players] Filter by teamId:', teamId);
    }

    if (search) {
      conditions.push("(LOWER(full_name) LIKE LOWER(@search))");
      params.search = `%${search}%`;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    console.log('[GET /api/players] WHERE clause:', whereClause);

    const playersResult = await query<{
      player_id: number;
      full_name: string;
      display_name: string | null;
      date_of_birth: string;
      nationality: string;
      preferred_position: string | null;
      current_team_id: number | null;
    }>(
      `
        SELECT 
          player_id,
          full_name,
          display_name,
          CONVERT(VARCHAR(10), date_of_birth, 23) as date_of_birth,
          nationality,
          preferred_position,
          current_team_id
        FROM players
        ${whereClause}
        ORDER BY full_name
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
      `,
      params,
    );

    const countResult = await query<{ total: number }>(
      `SELECT COUNT(*) as total FROM players ${whereClause}`,
      params,
    );

    const total = countResult.recordset[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    console.log('[GET /api/players] Results:', {
      total,
      returned: playersResult.recordset.length,
      page,
      limit
    });

    res.json({
      data: playersResult.recordset,
      total,
      pagination: {
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/players/avatars/batch - Batch fetch avatars for multiple players
 * Body: { playerIds: number[] }
 * NOTE: Must be before /:id route to avoid route conflict
 */
router.post("/avatars/batch", async (req, res, next) => {
  try {
    const { playerIds } = req.body;

    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return res.status(400).json({ error: "playerIds must be a non-empty array" });
    }

    // Validate all IDs are numbers
    const validIds = playerIds
      .map(id => typeof id === 'number' ? id : parseInt(String(id), 10))
      .filter(id => !isNaN(id) && id > 0);

    if (validIds.length === 0) {
      return res.status(400).json({ error: "No valid player IDs provided" });
    }

    // Limit batch size to prevent timeout
    const maxBatchSize = 50;
    const idsToProcess = validIds.slice(0, maxBatchSize);

    console.log('[API] Batch fetch avatars request:', idsToProcess);
    const avatars = await batchFetchPlayerAvatars(idsToProcess);
    console.log('[API] Batch fetch avatars result:', Object.keys(avatars).length, 'avatars found');

    res.json({ avatars });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/players/:id/avatar - Get player avatar URL
 * Fetches from database or TheSportsDB if not cached
 * NOTE: Must be before /:id route to avoid route conflict
 */
router.get("/:id/avatar", async (req, res, next) => {
  try {
    const playerId = parseInt(req.params.id, 10);
    if (isNaN(playerId)) {
      return res.status(400).json({ error: "Invalid player ID" });
    }

    const avatarUrl = await getOrFetchPlayerAvatar(playerId);

    if (!avatarUrl) {
      return res.status(404).json({ error: "Avatar not found" });
    }

    res.json({ avatarUrl });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /internal/players/:id - Get player by internal ID
 * ClubManager: only see players of their managed team
 */
router.get("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const playerId = parseInt(req.params.id, 10);
    if (isNaN(playerId)) {
      return res.status(400).json({ error: "Invalid player ID" });
    }

    const result = await query(
      `
        SELECT 
          player_id,
          full_name,
          display_name,
          CONVERT(VARCHAR(10), date_of_birth, 23) as date_of_birth,
          nationality,
          preferred_position,
          current_team_id
        FROM players
        WHERE player_id = @playerId;
      `,
      { playerId },
    );

    const player = result.recordset[0];
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    // Check permissions
    const isSuperAdmin = req.user?.roles?.includes('super_admin');
    const hasManageTeams = req.user?.permissions?.includes("manage_teams");
    const canSeeAll = isSuperAdmin || hasManageTeams;
    
    if (!canSeeAll) {
      // Team admin: check if player belongs to their assigned teams
      const userTeamIds = req.user?.teamIds || [];
      if (!userTeamIds.includes(player.current_team_id)) {
        return res.status(403).json({ error: "This player does not belong to your assigned team" });
      }
    }

    res.json({ data: player });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /internal/players/:id - Update player
 */
router.put("/:id", requireAuth, requireTeamOwnership, checkPlayerTeamOwnership, async (req, res, next) => {
  try {
    const playerId = parseInt(req.params.id, 10);
    if (isNaN(playerId)) {
      return res.status(400).json({ error: "Invalid player ID" });
    }

    const { name, position, nationality } = req.body;

    await query(
      `
        UPDATE players
        SET 
          full_name = COALESCE(@name, full_name),
          preferred_position = COALESCE(@position, preferred_position),
          nationality = COALESCE(@nationality, nationality),
          updated_at = SYSUTCDATETIME()
        WHERE player_id = @playerId;
      `,
      {
        playerId,
        name: name || null,
        position: position || null,
        nationality: nationality || null,
      },
    );

    // Return updated player
    const result = await query(
      `
        SELECT player_id, full_name, preferred_position, nationality
        FROM players
        WHERE player_id = @playerId;
      `,
      { playerId },
    );

    const player = result.recordset[0];
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.json({ data: player });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /internal/players/:id - Delete player
 */
router.delete("/:id", requireAuth, requireTeamOwnership, checkPlayerTeamOwnership, async (req, res, next) => {
  try {
    const playerId = parseInt(req.params.id, 10);
    if (isNaN(playerId)) {
      return res.status(400).json({ error: "Invalid player ID" });
    }

    await query(
      `
        DELETE FROM players
        WHERE player_id = @playerId;
      `,
      { playerId },
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
