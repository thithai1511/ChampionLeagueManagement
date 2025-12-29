/**
 * Player Service
 * 
 * Manages players in the internal `players` table.
 * No longer syncs from external API - all data is managed internally.
 */

import { query } from "../db/sqlServer";

export interface PlayerRecord {
  id: number;
  fullName: string;
  displayName: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  nationality: string | null;
  preferredPosition: string | null;
  secondaryPosition: string | null;
  heightCm: number | null;
  weightKg: number | null;
  biography: string | null;
  dominantFoot: string | null;
  currentTeamId: number | null;
  currentTeamName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface PlayerFilters {
  search?: string;
  teamId?: number;
  position?: string;
  nationality?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedPlayers {
  data: PlayerRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreatePlayerInput {
  fullName: string;
  displayName?: string;
  dateOfBirth: string;
  placeOfBirth?: string;
  nationality: string;
  preferredPosition?: string;
  secondaryPosition?: string;
  heightCm?: number;
  weightKg?: number;
  biography?: string;
  dominantFoot?: 'left' | 'right' | 'both';
  currentTeamId?: number;
  avatarUrl?: string;
  createdBy?: number;
}

export interface UpdatePlayerInput {
  fullName?: string;
  displayName?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  preferredPosition?: string;
  secondaryPosition?: string;
  heightCm?: number;
  weightKg?: number;
  biography?: string;
  dominantFoot?: 'left' | 'right' | 'both';
  currentTeamId?: number;
  avatarUrl?: string;
  updatedBy?: number;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const basePlayerSelect = `
  SELECT
    p.player_id AS id,
    p.full_name AS fullName,
    p.display_name AS displayName,
    CONVERT(VARCHAR(10), p.date_of_birth, 23) AS dateOfBirth,
    p.place_of_birth AS placeOfBirth,
    p.nationality,
    p.preferred_position AS preferredPosition,
    p.secondary_position AS secondaryPosition,
    p.height_cm AS heightCm,
    p.weight_kg AS weightKg,
    p.biography,
    p.dominant_foot AS dominantFoot,
    p.current_team_id AS currentTeamId,
    t.name AS currentTeamName,
    p.avatar_url AS avatarUrl,
    CONVERT(VARCHAR(23), p.created_at, 126) AS createdAt,
    CONVERT(VARCHAR(23), p.updated_at, 126) AS updatedAt
  FROM players p
  LEFT JOIN teams t ON p.current_team_id = t.team_id
`;

/**
 * List players with filters and pagination
 */
export const listPlayers = async (filters: PlayerFilters = {}): Promise<PaginatedPlayers> => {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit
    ? Math.min(Math.max(filters.limit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const parameters: Record<string, unknown> = { offset, limit };

  if (filters.search) {
    conditions.push(
      "(LOWER(p.full_name) LIKE LOWER(@search) OR LOWER(p.display_name) LIKE LOWER(@search) OR LOWER(t.name) LIKE LOWER(@search))"
    );
    parameters.search = `%${filters.search.trim()}%`;
  }

  if (filters.teamId) {
    conditions.push("p.current_team_id = @teamId");
    parameters.teamId = filters.teamId;
  }

  if (filters.position) {
    conditions.push("(LOWER(p.preferred_position) = LOWER(@position) OR LOWER(p.secondary_position) = LOWER(@position))");
    parameters.position = filters.position.trim();
  }

  if (filters.nationality) {
    conditions.push("LOWER(p.nationality) = LOWER(@nationality)");
    parameters.nationality = filters.nationality.trim();
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const dataResult = await query<PlayerRecord>(
    `
      ${basePlayerSelect}
      ${whereClause}
      ORDER BY p.full_name ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `,
    parameters
  );

  const countResult = await query<{ total: number }>(
    `
      SELECT COUNT(1) AS total
      FROM players p
      LEFT JOIN teams t ON p.current_team_id = t.team_id
      ${whereClause};
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
 * Get player by ID
 */
export const getPlayerById = async (id: number): Promise<PlayerRecord | null> => {
  const result = await query<PlayerRecord>(
    `
      ${basePlayerSelect}
      WHERE p.player_id = @id;
    `,
    { id }
  );

  return result.recordset[0] ?? null;
};

/**
 * Create a new player
 */
export const createPlayer = async (input: CreatePlayerInput): Promise<PlayerRecord> => {
  const result = await query<{ player_id: number }>(
    `
      INSERT INTO players (
        full_name, display_name, date_of_birth, place_of_birth, nationality,
        preferred_position, secondary_position, height_cm, weight_kg,
        biography, dominant_foot, current_team_id, avatar_url, created_by, created_at
      )
      OUTPUT INSERTED.player_id
      VALUES (
        @fullName, @displayName, @dateOfBirth, @placeOfBirth, @nationality,
        @preferredPosition, @secondaryPosition, @heightCm, @weightKg,
        @biography, @dominantFoot, @currentTeamId, @avatarUrl, @createdBy, SYSUTCDATETIME()
      );
    `,
    {
      fullName: input.fullName,
      displayName: input.displayName || input.fullName,
      dateOfBirth: input.dateOfBirth,
      placeOfBirth: input.placeOfBirth || null,
      nationality: input.nationality,
      preferredPosition: input.preferredPosition || null,
      secondaryPosition: input.secondaryPosition || null,
      heightCm: input.heightCm || null,
      weightKg: input.weightKg || null,
      biography: input.biography || null,
      dominantFoot: input.dominantFoot || null,
      currentTeamId: input.currentTeamId || null,
      avatarUrl: input.avatarUrl || null,
      createdBy: input.createdBy || null,
    }
  );

  const playerId = result.recordset[0].player_id;
  return (await getPlayerById(playerId))!;
};

/**
 * Update a player
 */
export const updatePlayer = async (
  id: number,
  input: UpdatePlayerInput
): Promise<PlayerRecord | null> => {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };

  if (input.fullName !== undefined) {
    fields.push("full_name = @fullName");
    params.fullName = input.fullName;
  }
  if (input.displayName !== undefined) {
    fields.push("display_name = @displayName");
    params.displayName = input.displayName;
  }
  if (input.dateOfBirth !== undefined) {
    fields.push("date_of_birth = @dateOfBirth");
    params.dateOfBirth = input.dateOfBirth;
  }
  if (input.placeOfBirth !== undefined) {
    fields.push("place_of_birth = @placeOfBirth");
    params.placeOfBirth = input.placeOfBirth;
  }
  if (input.nationality !== undefined) {
    fields.push("nationality = @nationality");
    params.nationality = input.nationality;
  }
  if (input.preferredPosition !== undefined) {
    fields.push("preferred_position = @preferredPosition");
    params.preferredPosition = input.preferredPosition;
  }
  if (input.secondaryPosition !== undefined) {
    fields.push("secondary_position = @secondaryPosition");
    params.secondaryPosition = input.secondaryPosition;
  }
  if (input.heightCm !== undefined) {
    fields.push("height_cm = @heightCm");
    params.heightCm = input.heightCm;
  }
  if (input.weightKg !== undefined) {
    fields.push("weight_kg = @weightKg");
    params.weightKg = input.weightKg;
  }
  if (input.biography !== undefined) {
    fields.push("biography = @biography");
    params.biography = input.biography;
  }
  if (input.dominantFoot !== undefined) {
    fields.push("dominant_foot = @dominantFoot");
    params.dominantFoot = input.dominantFoot;
  }
  if (input.currentTeamId !== undefined) {
    fields.push("current_team_id = @currentTeamId");
    params.currentTeamId = input.currentTeamId;
  }
  if (input.avatarUrl !== undefined) {
    fields.push("avatar_url = @avatarUrl");
    params.avatarUrl = input.avatarUrl;
  }
  if (input.updatedBy !== undefined) {
    fields.push("updated_by = @updatedBy");
    params.updatedBy = input.updatedBy;
  }

  if (fields.length === 0) {
    return getPlayerById(id);
  }

  fields.push("updated_at = SYSUTCDATETIME()");

  await query(
    `
      UPDATE players
      SET ${fields.join(", ")}
      WHERE player_id = @id;
    `,
    params
  );

  return getPlayerById(id);
};

/**
 * Delete a player
 */
export const deletePlayer = async (id: number): Promise<boolean> => {
  const result = await query<{ rowsAffected: number }>(
    "DELETE FROM players WHERE player_id = @id;",
    { id }
  );
  const rowsAffected = result.rowsAffected?.[0] ?? 0;
  return rowsAffected > 0;
};

/**
 * Get players by team
 */
export const getPlayersByTeam = async (teamId: number): Promise<PlayerRecord[]> => {
  const result = await query<PlayerRecord>(
    `
      ${basePlayerSelect}
      WHERE p.current_team_id = @teamId
      ORDER BY p.full_name ASC;
    `,
    { teamId }
  );

  return result.recordset;
};

/**
 * Search players by name
 */
export const searchPlayers = async (searchTerm: string, limit: number = 20): Promise<PlayerRecord[]> => {
  const result = await query<PlayerRecord>(
    `
      ${basePlayerSelect}
      WHERE LOWER(p.full_name) LIKE LOWER(@search) OR LOWER(p.display_name) LIKE LOWER(@search)
      ORDER BY p.full_name ASC
      OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY;
    `,
    { search: `%${searchTerm.trim()}%`, limit }
  );

  return result.recordset;
};

// Legacy export for backward compatibility - returns empty result
export const syncPlayersFromUpstream = async (): Promise<{ season: undefined; totalTeams: number; totalPlayers: number }> => {
  console.warn('[playerService] syncPlayersFromUpstream is deprecated - external API sync disabled');
  return { season: undefined, totalTeams: 0, totalPlayers: 0 };
};
