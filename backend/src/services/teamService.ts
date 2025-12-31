/**
 * Team Service
 * 
 * Manages teams in the internal `teams` table.
 * No longer syncs from external API - all data is managed internally.
 */

import { query } from "../db/sqlServer";

export interface TeamRecord {
  id: number;
  name: string;
  shortName: string | null;
  code: string | null;
  governingBody: string | null;
  city: string | null;
  country: string | null;
  homeStadiumId: number | null;
  stadiumName: string | null;
  stadiumCapacity: number | null;
  foundedYear: number | null;
  description: string | null;
  homeKitDescription: string | null;
  homeKitColor: string | null;
  awayKitColor: string | null;
  homeKitImage: string | null;
  awayKitImage: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface TeamFilters {
  search?: string;
  country?: string;
  city?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedTeams {
  data: TeamRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateTeamInput {
  name: string;
  shortName?: string;
  code?: string;
  governingBody?: string;
  city?: string;
  country?: string;
  homeStadiumId?: number;
  stadiumName?: string;
  stadiumCapacity?: number;
  foundedYear?: number;
  description?: string;
  homeKitDescription?: string;
  homeKitColor?: string;
  awayKitColor?: string;
  homeKitImage?: string;
  awayKitImage?: string;
  phone?: string;
  email?: string;
  website?: string;
  status?: string;
  createdBy?: number;
}

export interface UpdateTeamInput {
  name?: string;
  shortName?: string;
  code?: string;
  governingBody?: string;
  city?: string;
  country?: string;
  homeStadiumId?: number;
  stadiumName?: string;
  stadiumCapacity?: number;
  foundedYear?: number;
  description?: string;
  homeKitDescription?: string;
  homeKitColor?: string;
  awayKitColor?: string;
  homeKitImage?: string;
  awayKitImage?: string;
  phone?: string;
  email?: string;
  website?: string;
  status?: string;
  updatedBy?: number;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const baseTeamSelect = `
  SELECT
    t.team_id AS id,
    t.name,
    t.short_name AS shortName,
    t.code,
    t.governing_body AS governingBody,
    t.city,
    t.country,
    t.home_stadium_id AS homeStadiumId,
    t.stadium_name AS stadiumName,
    t.stadium_capacity AS stadiumCapacity,
    t.founded_year AS foundedYear,
    t.description,
    t.home_kit_description AS homeKitDescription,
    t.home_kit_color AS homeKitColor,
    t.away_kit_color AS awayKitColor,
    t.home_kit_image AS homeKitImage,
    t.away_kit_image AS awayKitImage,
    t.phone,
    t.email,
    t.website,
    t.status,
    CONVERT(VARCHAR(23), t.created_at, 126) AS createdAt,
    CONVERT(VARCHAR(23), t.updated_at, 126) AS updatedAt
  FROM teams t
`;

/**
 * List teams with filters and pagination
 */
export const listTeams = async (filters: TeamFilters = {}): Promise<PaginatedTeams> => {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit
    ? Math.min(Math.max(filters.limit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const parameters: Record<string, unknown> = { offset, limit };

  if (filters.search) {
    conditions.push(
      "(LOWER(t.name) LIKE LOWER(@search) OR LOWER(t.short_name) LIKE LOWER(@search) OR LOWER(t.code) LIKE LOWER(@search))"
    );
    parameters.search = `%${filters.search.trim()}%`;
  }

  if (filters.country) {
    conditions.push("LOWER(t.country) LIKE LOWER(@country)");
    parameters.country = `%${filters.country.trim()}%`;
  }

  if (filters.city) {
    conditions.push("LOWER(t.city) LIKE LOWER(@city)");
    parameters.city = `%${filters.city.trim()}%`;
  }

  if (filters.status) {
    conditions.push("t.status = @status");
    parameters.status = filters.status;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const dataResult = await query<TeamRecord>(
    `
      ${baseTeamSelect}
      ${whereClause}
      ORDER BY t.name ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `,
    parameters
  );

  const countResult = await query<{ total: number }>(
    `
      SELECT COUNT(1) AS total FROM teams t ${whereClause};
    `,
    parameters
  );

  const total = countResult.recordset[0]?.total ?? 0;
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

  return {
    data: dataResult.recordset,
    total,
    page,
    limit,
    totalPages,
  };
};

/**
 * Get team by ID
 */
export const getTeamById = async (id: number): Promise<TeamRecord | null> => {
  const result = await query<TeamRecord>(
    `${baseTeamSelect} WHERE t.team_id = @id;`,
    { id }
  );
  return result.recordset[0] ?? null;
};

/**
 * Get internal team by ID (alias for backward compatibility)
 */
export const getInternalTeamById = async (teamId: number): Promise<TeamRecord | null> => {
  return getTeamById(teamId);
};

/**
 * Create a new team
 */
export const createTeam = async (input: CreateTeamInput): Promise<TeamRecord> => {
  const result = await query<{ team_id: number }>(
    `
      INSERT INTO teams (
        name, short_name, code, governing_body, city, country,
        home_stadium_id, stadium_name, stadium_capacity, founded_year,
        description, home_kit_description, home_kit_color, away_kit_color, home_kit_image, away_kit_image,
        phone, email, website, status,
        created_by, created_at
      )
      OUTPUT INSERTED.team_id
      VALUES (
        @name, @shortName, @code, @governingBody, @city, @country,
        @homeStadiumId, @stadiumName, @stadiumCapacity, @foundedYear,
        @description, @homeKitDescription, @homeKitColor, @awayKitColor, @homeKitImage, @awayKitImage,
        @phone, @email, @website, @status,
        @createdBy, SYSUTCDATETIME()
      );
    `,
    {
      name: input.name,
      shortName: input.shortName || null,
      code: input.code || null,
      governingBody: input.governingBody || null,
      city: input.city || null,
      country: input.country || 'Vietnam',
      homeStadiumId: input.homeStadiumId || null,
      stadiumName: input.stadiumName || null,
      stadiumCapacity: input.stadiumCapacity || null,
      foundedYear: input.foundedYear || null,
      description: input.description || null,
      homeKitDescription: input.homeKitDescription || null,
      homeKitColor: input.homeKitColor || null,
      awayKitColor: input.awayKitColor || null,
      homeKitImage: input.homeKitImage || null,
      awayKitImage: input.awayKitImage || null,
      phone: input.phone || null,
      email: input.email || null,
      website: input.website || null,
      status: input.status || 'active',
      createdBy: input.createdBy || null,
    }
  );

  const teamId = result.recordset[0].team_id;
  return (await getTeamById(teamId))!;
};

/**
 * Update a team
 */
export const updateTeam = async (
  id: number,
  input: UpdateTeamInput
): Promise<TeamRecord | null> => {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };

  if (input.name !== undefined) {
    fields.push("name = @name");
    params.name = input.name;
  }
  if (input.shortName !== undefined) {
    fields.push("short_name = @shortName");
    params.shortName = input.shortName;
  }
  if (input.code !== undefined) {
    fields.push("code = @code");
    params.code = input.code;
  }
  if (input.governingBody !== undefined) {
    fields.push("governing_body = @governingBody");
    params.governingBody = input.governingBody;
  }
  if (input.city !== undefined) {
    fields.push("city = @city");
    params.city = input.city;
  }
  if (input.country !== undefined) {
    fields.push("country = @country");
    params.country = input.country;
  }
  if (input.homeStadiumId !== undefined) {
    fields.push("home_stadium_id = @homeStadiumId");
    params.homeStadiumId = input.homeStadiumId;
  }
  if (input.stadiumName !== undefined) {
    fields.push("stadium_name = @stadiumName");
    params.stadiumName = input.stadiumName;
  }
  if (input.stadiumCapacity !== undefined) {
    fields.push("stadium_capacity = @stadiumCapacity");
    params.stadiumCapacity = input.stadiumCapacity;
  }
  if (input.foundedYear !== undefined) {
    fields.push("founded_year = @foundedYear");
    params.foundedYear = input.foundedYear;
  }
  if (input.description !== undefined) {
    fields.push("description = @description");
    params.description = input.description;
  }
  if (input.homeKitDescription !== undefined) {
    fields.push("home_kit_description = @homeKitDescription");
    params.homeKitDescription = input.homeKitDescription;
  }
  if (input.homeKitColor !== undefined) {
    fields.push("home_kit_color = @homeKitColor");
    params.homeKitColor = input.homeKitColor;
  }
  if (input.awayKitColor !== undefined) {
    fields.push("away_kit_color = @awayKitColor");
    params.awayKitColor = input.awayKitColor;
  }
  if (input.homeKitImage !== undefined) {
    fields.push("home_kit_image = @homeKitImage");
    params.homeKitImage = input.homeKitImage;
  }
  if (input.awayKitImage !== undefined) {
    fields.push("away_kit_image = @awayKitImage");
    params.awayKitImage = input.awayKitImage;
  }
  if (input.phone !== undefined) {
    fields.push("phone = @phone");
    params.phone = input.phone;
  }
  if (input.email !== undefined) {
    fields.push("email = @email");
    params.email = input.email;
  }
  if (input.website !== undefined) {
    fields.push("website = @website");
    params.website = input.website;
  }
  if (input.status !== undefined) {
    fields.push("status = @status");
    params.status = input.status;
  }
  if (input.updatedBy !== undefined) {
    fields.push("updated_by = @updatedBy");
    params.updatedBy = input.updatedBy;
  }

  if (fields.length === 0) {
    return getTeamById(id);
  }

  fields.push("updated_at = SYSUTCDATETIME()");

  await query(
    `UPDATE teams SET ${fields.join(", ")} WHERE team_id = @id;`,
    params
  );

  return getTeamById(id);
};

/**
 * Delete a team
 */
export const deleteTeam = async (id: number): Promise<boolean> => {
  // Check for references
  const refCheckResult = await query<{ table_name: string; ref_count: number }>(
    `
    SELECT 'season_team_participants' AS table_name, COUNT(*) AS ref_count 
    FROM season_team_participants WHERE team_id = @id
    UNION ALL
    SELECT 'season_invitations', COUNT(*) FROM season_invitations WHERE team_id = @id
    UNION ALL
    SELECT 'season_team_registrations', COUNT(*) FROM season_team_registrations WHERE team_id = @id
    UNION ALL
    SELECT 'team_kits', COUNT(*) FROM team_kits WHERE team_id = @id
    UNION ALL
    SELECT 'players', COUNT(*) FROM players WHERE current_team_id = @id
    UNION ALL
    SELECT 'user_team_assignments', COUNT(*) FROM user_team_assignments WHERE team_id = @id
    `,
    { id }
  );

  const references: string[] = [];
  for (const row of refCheckResult.recordset || []) {
    if (row.ref_count > 0) {
      const tableName = row.table_name;
      const count = row.ref_count;
      switch (tableName) {
        case 'season_team_participants':
          references.push(`${count} mùa giải tham gia`);
          break;
        case 'season_invitations':
          references.push(`${count} lời mời giải đấu`);
          break;
        case 'season_team_registrations':
          references.push(`${count} đăng ký giải đấu`);
          break;
        case 'team_kits':
          references.push(`${count} bộ đồng phục`);
          break;
        case 'players':
          references.push(`${count} cầu thủ`);
          break;
        case 'user_team_assignments':
          references.push(`${count} quản trị viên đội`);
          break;
      }
    }
  }

  if (references.length > 0) {
    throw new Error(`Không thể xóa đội bóng. Đội bóng có liên kết với: ${references.join(', ')}.`);
  }

  try {
    const result = await query<{ rowsAffected: number }>(
      "DELETE FROM teams WHERE team_id = @id;",
      { id }
    );
    const rowsAffected = result.rowsAffected?.[0] ?? 0;
    return rowsAffected > 0;
  } catch (error: any) {
    if (error?.number === 547) {
      throw new Error(`Không thể xóa đội bóng do có dữ liệu liên quan.`);
    }
    throw error;
  }
};

/**
 * Get teams by IDs
 */
export const getTeamsByIds = async (ids: number[]): Promise<TeamRecord[]> => {
  if (ids.length === 0) return [];

  const placeholders = ids.map((_, i) => `@id${i}`).join(', ');
  const params: Record<string, unknown> = {};
  ids.forEach((id, i) => { params[`id${i}`] = id; });

  const result = await query<TeamRecord>(
    `${baseTeamSelect} WHERE t.team_id IN (${placeholders}) ORDER BY t.name ASC;`,
    params
  );

  return result.recordset;
};

/**
 * Search teams by name
 */
export const searchTeams = async (searchTerm: string, limit: number = 20): Promise<TeamRecord[]> => {
  const result = await query<TeamRecord>(
    `
      ${baseTeamSelect}
      WHERE LOWER(t.name) LIKE LOWER(@search) OR LOWER(t.short_name) LIKE LOWER(@search)
      ORDER BY t.name ASC
      OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY;
    `,
    { search: `%${searchTerm.trim()}%`, limit }
  );

  return result.recordset;
};

// Legacy exports for backward compatibility - returns empty result
export const syncTeamsFromUpstream = async (): Promise<{ season: undefined; totalTeams: number }> => {
  console.warn('[teamService] syncTeamsFromUpstream is deprecated - external API sync disabled');
  return { season: undefined, totalTeams: 0 };
};

export const getTeamByExternalId = async (): Promise<null> => {
  console.warn('[teamService] getTeamByExternalId is deprecated - external API sync disabled');
  return null;
};
