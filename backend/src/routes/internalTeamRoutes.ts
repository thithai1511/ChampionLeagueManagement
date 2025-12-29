import { Router } from "express";
import { z } from "zod";
import { query } from "../db/sqlServer";
import { requireAuth, requirePermission, requireTeamOwnership } from "../middleware/authMiddleware";
import { logEvent } from "../services/auditService";
import { getInternalSeasons, getInternalStandings } from "../services/seasonService";
import { AuthenticatedRequest } from "../types";

const router = Router();
const requireTeamManagement = [requireAuth, requirePermission("manage_teams")] as const;
const requireTeamOwnershipCheck = [requireAuth, requireTeamOwnership] as const;

const teamCreateSchema = z.object({
  name: z.string().trim().min(1).max(255),
  short_name: z.string().trim().max(50).optional().nullable(),
  code: z.string().trim().max(32).optional().nullable(),
  city: z.string().trim().max(150).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  founded_year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  status: z.enum(["active", "inactive", "suspended"]).optional().nullable(),
  // New contact/stadium fields
  phone: z.string().trim().max(32).optional().nullable(),
  email: z.string().trim().max(255).optional().nullable(),
  stadium_name: z.string().trim().max(255).optional().nullable(),
  stadium_capacity: z.coerce.number().int().min(0).optional().nullable(),
  website: z.string().trim().max(255).optional().nullable(),
  description: z.string().trim().optional().nullable(),
});

const teamUpdateSchema = teamCreateSchema.partial();

/**
 * GET /internal/teams - Get teams from internal database (not Football* tables)
 * ClubManager: only sees their own team
 * Admin: sees all teams
 */
router.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const page = typeof req.query.page === "string" ? parseInt(req.query.page, 10) : 1;
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 25;
    const offset = (page - 1) * limit;

    let whereClause = "";
    const params: Record<string, unknown> = { offset, limit };

    // ClubManager: only see their managed team
    const managedTeamId = (req.user as any)?.managed_team_id;
    const isAdmin = req.user?.permissions?.includes("manage_teams");
    
    if (!isAdmin && managedTeamId) {
      whereClause = "WHERE team_id = @managedTeamId";
      params.managedTeamId = managedTeamId;
    } else if (search) {
      whereClause = "WHERE name LIKE @search OR short_name LIKE @search OR code LIKE @search";
      params.search = `%${search}%`;
    }

    const teamsResult = await query<{
      team_id: number;
      name: string;
      short_name: string | null;
      code: string | null;
      governing_body: string | null;
      city: string | null;
      country: string | null;
      home_stadium_id: number | null;
      founded_year: number | null;
      description: string | null;
      home_kit_description: string | null;
      status: string;
    }>(
      `
        SELECT 
          team_id,
          name,
          short_name,
          code,
          governing_body,
          city,
          country,
          home_stadium_id,
          founded_year,
          description,
          home_kit_description,
          status
        FROM teams
        ${whereClause}
        ORDER BY name
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
      `,
      params,
    );

    const countResult = await query<{ total: number }>(
      `SELECT COUNT(*) as total FROM teams ${whereClause};`,
      params,
    );

    const total = countResult.recordset[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: teamsResult.recordset,
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

router.get("/seasons", async (_req, res, next) => {
  try {
    const seasons = await getInternalSeasons();
    res.json({ data: seasons });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /teams/standings - Get internal standings table
 * Query: seasonId? | season? (year string)
 */
router.get("/standings", async (req, res, next) => {
  try {
    const seasonId = typeof req.query.seasonId === "string" ? Number(req.query.seasonId) : undefined;
    const season = typeof req.query.season === "string" && req.query.season.trim() ? req.query.season.trim() : undefined;

    const standings = await getInternalStandings({ seasonId, season });
    res.json({ data: standings });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /internal/teams - Create team
 */
router.post("/", ...requireTeamManagement, async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = teamCreateSchema.parse(req.body ?? {});

    try {
      const createdResult = await query<{
        team_id: number;
        name: string;
        short_name: string | null;
        code: string | null;
        city: string | null;
        country: string | null;
        founded_year: number | null;
        status: string;
      }>(
        `
          INSERT INTO teams (name, short_name, code, city, country, founded_year, status, created_by)
          OUTPUT
            inserted.team_id,
            inserted.name,
            inserted.short_name,
            inserted.code,
            inserted.city,
            inserted.country,
            inserted.founded_year,
            inserted.status
          VALUES (
            @name,
            @short_name,
            @code,
            @city,
            @country,
            @founded_year,
            COALESCE(@status, 'active'),
            @created_by
          );
        `,
        {
          name: payload.name,
          short_name: payload.short_name ?? null,
          code: payload.code ?? null,
          city: payload.city ?? null,
          country: payload.country ?? null,
          founded_year: payload.founded_year ?? null,
          status: payload.status ?? null,
          created_by: req.user?.sub ?? null,
        },
      );

      const created = createdResult.recordset[0];
      if (!created) {
        return res.status(500).json({ error: "Failed to create team" });
      }

      await logEvent({
        eventType: "TEAM_CREATED",
        severity: "info",
        actorId: req.user?.sub,
        actorUsername: req.user?.username,
        actorRole: Array.isArray(req.user?.roles) ? req.user.roles[0] : undefined,
        entityType: "TEAM",
        entityId: String(created.team_id),
        payload: { after: created },
      });

      res.status(201).json({ data: created });
      return;
    } catch (error: any) {
      if (error?.number === 2627 || error?.number === 2601) {
        res.status(409).json({ error: "Team already exists" });
        return;
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /internal/teams/:id - Get team by internal ID
 * ClubManager: only see their own team
 */
router.get("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: "Invalid team ID" });
    }

    // ClubManager: check if this team is their managed team
    const managedTeamId = (req.user as any)?.managed_team_id;
    const isAdmin = req.user?.permissions?.includes("manage_teams");
    
    if (!isAdmin && managedTeamId && teamId !== managedTeamId) {
      return res.status(403).json({ error: "You can only view your assigned team" });
    }

    const result = await query<{
      team_id: number;
      name: string;
      short_name: string | null;
      code: string | null;
      governing_body: string | null;
      city: string | null;
      country: string | null;
      home_stadium_id: number | null;
      founded_year: number | null;
      description: string | null;
      home_kit_description: string | null;
      status: string;
      phone: string | null;
      email: string | null;
      stadium_name: string | null;
      stadium_capacity: number | null;
      website: string | null;
    }>(
      `
        SELECT 
          team_id,
          name,
          short_name,
          code,
          governing_body,
          city,
          country,
          home_stadium_id,
          founded_year,
          description,
          home_kit_description,
          status,
          phone,
          email,
          stadium_name,
          stadium_capacity,
          website
        FROM teams
        WHERE team_id = @teamId;
      `,
      { teamId },
    );

    const team = result.recordset[0];
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({ data: team });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /internal/teams/:id/players - Get players of a team
 * ClubManager: only see players of their managed team
 */
router.get("/:id/players", async (req: AuthenticatedRequest, res, next) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: "Invalid team ID" });
    }

    // Check permissions
    const isSuperAdmin = req.user?.roles?.includes('super_admin');
    const hasManageTeams = req.user?.permissions?.includes("manage_teams");
    const canSeeAll = isSuperAdmin || hasManageTeams;
    
    if (!canSeeAll) {
      // Team admin: check if this team is in their assigned teams
      const userTeamIds = req.user?.teamIds || [];
      if (!userTeamIds.includes(teamId)) {
        return res.status(403).json({ error: "You can only view players of your assigned team" });
      }
    }

    const result = await query<{
      player_id: number;
      full_name: string;
      display_name: string | null;
      date_of_birth: string;
      place_of_birth: string | null;
      nationality: string;
      preferred_position: string | null;
      secondary_position: string | null;
      height_cm: number | null;
      weight_kg: number | null;
      dominant_foot: string | null;
      current_team_id: number | null;
    }>(
      `
        SELECT 
          p.player_id,
          p.full_name,
          p.display_name,
          CONVERT(VARCHAR(10), p.date_of_birth, 23) as date_of_birth,
          p.place_of_birth,
          p.nationality,
          p.preferred_position,
          p.secondary_position,
          p.height_cm,
          p.weight_kg,
          p.dominant_foot,
          p.current_team_id
        FROM players p
        WHERE p.current_team_id = @teamId
        ORDER BY p.full_name;
    `,
      { teamId },
    );

    res.json({
      data: result.recordset,
      total: result.recordset.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /internal/teams/:id - Update team
 */
router.put("/:id", ...requireTeamOwnershipCheck, async (req: AuthenticatedRequest, res, next) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: "Invalid team ID" });
    }

    const payload = teamUpdateSchema.parse(req.body ?? {});
    const keys = Object.keys(payload);
    if (keys.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const existingResult = await query<{
      team_id: number;
      name: string;
      short_name: string | null;
      code: string | null;
      city: string | null;
      country: string | null;
      founded_year: number | null;
      status: string;
    }>(
      `
        SELECT team_id, name, short_name, code, city, country, founded_year, status
        FROM teams
        WHERE team_id = @teamId;
    `,
      { teamId },
    );

    const existing = existingResult.recordset[0];
    if (!existing) {
      return res.status(404).json({ error: "Team not found" });
    }

    const hasName = Object.prototype.hasOwnProperty.call(payload, "name");
    const hasShortName = Object.prototype.hasOwnProperty.call(payload, "short_name");
    const hasCode = Object.prototype.hasOwnProperty.call(payload, "code");
    const hasCity = Object.prototype.hasOwnProperty.call(payload, "city");
    const hasCountry = Object.prototype.hasOwnProperty.call(payload, "country");
    const hasFoundedYear = Object.prototype.hasOwnProperty.call(payload, "founded_year");
    const hasStatus = Object.prototype.hasOwnProperty.call(payload, "status");
    // New fields
    const hasPhone = Object.prototype.hasOwnProperty.call(payload, "phone");
    const hasEmail = Object.prototype.hasOwnProperty.call(payload, "email");
    const hasStadiumName = Object.prototype.hasOwnProperty.call(payload, "stadium_name");
    const hasStadiumCapacity = Object.prototype.hasOwnProperty.call(payload, "stadium_capacity");
    const hasWebsite = Object.prototype.hasOwnProperty.call(payload, "website");
    const hasDescription = Object.prototype.hasOwnProperty.call(payload, "description");

    try {
      await query(
        `
          UPDATE teams
          SET
            name = CASE WHEN @has_name = 1 THEN @name ELSE name END,
            short_name = CASE WHEN @has_short_name = 1 THEN @short_name ELSE short_name END,
            code = CASE WHEN @has_code = 1 THEN @code ELSE code END,
            city = CASE WHEN @has_city = 1 THEN @city ELSE city END,
            country = CASE WHEN @has_country = 1 THEN @country ELSE country END,
            founded_year = CASE WHEN @has_founded_year = 1 THEN @founded_year ELSE founded_year END,
            status = CASE WHEN @has_status = 1 THEN COALESCE(@status, status) ELSE status END,
            phone = CASE WHEN @has_phone = 1 THEN @phone ELSE phone END,
            email = CASE WHEN @has_email = 1 THEN @email ELSE email END,
            stadium_name = CASE WHEN @has_stadium_name = 1 THEN @stadium_name ELSE stadium_name END,
            stadium_capacity = CASE WHEN @has_stadium_capacity = 1 THEN @stadium_capacity ELSE stadium_capacity END,
            website = CASE WHEN @has_website = 1 THEN @website ELSE website END,
            description = CASE WHEN @has_description = 1 THEN @description ELSE description END,
            updated_at = SYSUTCDATETIME(),
            updated_by = @updated_by
          WHERE team_id = @teamId;
        `,
        {
          teamId,
          updated_by: req.user?.sub ?? null,
          has_name: hasName ? 1 : 0,
          name: hasName ? (payload as any).name : null,
          has_short_name: hasShortName ? 1 : 0,
          short_name: hasShortName ? (payload as any).short_name ?? null : null,
          has_code: hasCode ? 1 : 0,
          code: hasCode ? (payload as any).code ?? null : null,
          has_city: hasCity ? 1 : 0,
          city: hasCity ? (payload as any).city ?? null : null,
          has_country: hasCountry ? 1 : 0,
          country: hasCountry ? (payload as any).country ?? null : null,
          has_founded_year: hasFoundedYear ? 1 : 0,
          founded_year: hasFoundedYear ? (payload as any).founded_year ?? null : null,
          has_status: hasStatus ? 1 : 0,
          status: hasStatus ? (payload as any).status ?? null : null,
          // New fields
          has_phone: hasPhone ? 1 : 0,
          phone: hasPhone ? (payload as any).phone ?? null : null,
          has_email: hasEmail ? 1 : 0,
          email: hasEmail ? (payload as any).email ?? null : null,
          has_stadium_name: hasStadiumName ? 1 : 0,
          stadium_name: hasStadiumName ? (payload as any).stadium_name ?? null : null,
          has_stadium_capacity: hasStadiumCapacity ? 1 : 0,
          stadium_capacity: hasStadiumCapacity ? (payload as any).stadium_capacity ?? null : null,
          has_website: hasWebsite ? 1 : 0,
          website: hasWebsite ? (payload as any).website ?? null : null,
          has_description: hasDescription ? 1 : 0,
          description: hasDescription ? (payload as any).description ?? null : null,
        },
      );
    } catch (error: any) {
      if (error?.number === 2627 || error?.number === 2601) {
        return res.status(409).json({ error: "Team name or code already exists" });
      }
      throw error;
    }

    // Return updated team
    const result = await query<{
      team_id: number;
      name: string;
      short_name: string | null;
      code: string | null;
      city: string | null;
      country: string | null;
      founded_year: number | null;
      status: string;
      phone: string | null;
      email: string | null;
      stadium_name: string | null;
      stadium_capacity: number | null;
      website: string | null;
      description: string | null;
    }>(
      `
        SELECT team_id, name, short_name, code, city, country, founded_year, status,
               phone, email, stadium_name, stadium_capacity, website, description
        FROM teams
        WHERE team_id = @teamId;
      `,
      { teamId },
    );

    const team = result.recordset[0];
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    await logEvent({
      eventType: "TEAM_UPDATED",
      severity: "info",
      actorId: req.user?.sub,
      actorUsername: req.user?.username,
      actorRole: Array.isArray(req.user?.roles) ? req.user.roles[0] : undefined,
      entityType: "TEAM",
      entityId: String(teamId),
      payload: { before: existing, after: team },
    });

    res.json({ data: team });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /internal/teams/:id - Delete team
 */
router.delete("/:id", ...requireTeamOwnershipCheck, async (req: AuthenticatedRequest, res, next) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: "Invalid team ID" });
    }

    const existingResult = await query<{
      team_id: number;
      name: string;
      short_name: string | null;
      code: string | null;
      city: string | null;
      country: string | null;
      founded_year: number | null;
      status: string;
    }>(
      `
        SELECT team_id, name, short_name, code, city, country, founded_year, status
        FROM teams
        WHERE team_id = @teamId;
    `,
      { teamId },
    );

    const existing = existingResult.recordset[0];
    if (!existing) {
      return res.status(404).json({ error: "Team not found" });
    }

    try {
      await query(
        `
          DELETE FROM teams
          WHERE team_id = @teamId;
    `,
        { teamId },
      );
    } catch (error: any) {
      if (error?.number === 547) {
        return res.status(409).json({ error: "Team is referenced and cannot be deleted" });
      }
      throw error;
    }

    await logEvent({
      eventType: "TEAM_DELETED",
      severity: "warning",
      actorId: req.user?.sub,
      actorUsername: req.user?.username,
      actorRole: Array.isArray(req.user?.roles) ? req.user.roles[0] : undefined,
      entityType: "TEAM",
      entityId: String(teamId),
      payload: { before: existing },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;

