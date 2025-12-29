import { query } from "../db/sqlServer";

export interface StadiumData {
  stadium_id: number;
  name: string;
  location: string;
  city: string;
  capacity: number;
  country: string;
  surface_type: string;
  year_built: number | null;
  team_id: number | null;
  team_name: string | null;
  managed_by_user_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

// Input type for creating stadium (without auto-generated fields)
export type CreateStadiumInput = Omit<StadiumData, "stadium_id" | "created_at" | "updated_at" | "team_name">;

const baseStadiumSelect = `
  SELECT
    st.stadium_id,
    st.name,
    st.location,
    st.city,
    st.capacity,
    st.country,
    st.surface_type,
    st.year_built,
    st.team_id,
    t.name AS team_name,
    st.managed_by_user_id,
    st.is_active,
    CONVERT(VARCHAR(23), st.created_at, 126) AS created_at,
    CONVERT(VARCHAR(23), st.updated_at, 126) AS updated_at
  FROM stadiums st
  LEFT JOIN teams t ON st.team_id = t.team_id
`;

/**
 * Create a new stadium
 */
export async function createStadium(
  stadiumData: CreateStadiumInput
): Promise<StadiumData> {
  const result = await query<StadiumData>(
    `
    INSERT INTO stadiums (name, location, city, capacity, country, surface_type, year_built, team_id, managed_by_user_id, is_active, created_at)
    OUTPUT INSERTED.*
    VALUES (@name, @location, @city, @capacity, @country, @surfaceType, @yearBuilt, @teamId, @managedByUserId, @isActive, GETUTCDATE())
  `,
    {
      name: stadiumData.name,
      location: stadiumData.location,
      city: stadiumData.city,
      capacity: stadiumData.capacity,
      country: stadiumData.country,
      surfaceType: stadiumData.surface_type,
      yearBuilt: stadiumData.year_built,
      teamId: stadiumData.team_id,
      managedByUserId: stadiumData.managed_by_user_id,
      isActive: stadiumData.is_active,
    }
  );

  return result.recordset[0];
}

/**
 * Get all stadiums
 */
export async function getAllStadiums(): Promise<StadiumData[]> {
  const result = await query<StadiumData>(
    `${baseStadiumSelect} ORDER BY st.name ASC`
  );
  return result.recordset;
}

/**
 * Get active stadiums only
 */
export async function getActiveStadiums(): Promise<StadiumData[]> {
  const result = await query<StadiumData>(
    `${baseStadiumSelect} WHERE st.is_active = 1 ORDER BY st.name ASC`
  );
  return result.recordset;
}

/**
 * Get stadium by ID
 */
export async function getStadiumById(stadiumId: number): Promise<StadiumData | null> {
  const result = await query<StadiumData>(
    `${baseStadiumSelect} WHERE st.stadium_id = @stadiumId`,
    { stadiumId }
  );
  return result.recordset[0] || null;
}

/**
 * Get stadium by team ID
 */
export async function getStadiumByTeam(teamId: number): Promise<StadiumData | null> {
  const result = await query<StadiumData>(
    `${baseStadiumSelect} WHERE st.team_id = @teamId`,
    { teamId }
  );
  return result.recordset[0] || null;
}

/**
 * Update stadium information
 */
export async function updateStadium(
  stadiumId: number,
  updates: Partial<StadiumData>
): Promise<StadiumData | null> {
  const fields: string[] = [];
  const params: Record<string, unknown> = { stadiumId };

  if (updates.name !== undefined) {
    fields.push("name = @name");
    params.name = updates.name;
  }
  if (updates.location !== undefined) {
    fields.push("location = @location");
    params.location = updates.location;
  }
  if (updates.city !== undefined) {
    fields.push("city = @city");
    params.city = updates.city;
  }
  if (updates.capacity !== undefined) {
    fields.push("capacity = @capacity");
    params.capacity = updates.capacity;
  }
  if (updates.country !== undefined) {
    fields.push("country = @country");
    params.country = updates.country;
  }
  if (updates.surface_type !== undefined) {
    fields.push("surface_type = @surfaceType");
    params.surfaceType = updates.surface_type;
  }
  if (updates.year_built !== undefined) {
    fields.push("year_built = @yearBuilt");
    params.yearBuilt = updates.year_built;
  }
  if (updates.managed_by_user_id !== undefined) {
    fields.push("managed_by_user_id = @managedByUserId");
    params.managedByUserId = updates.managed_by_user_id;
  }
  if (updates.is_active !== undefined) {
    fields.push("is_active = @isActive");
    params.isActive = updates.is_active;
  }

  if (fields.length === 0) {
    return getStadiumById(stadiumId);
  }

  fields.push("updated_at = GETUTCDATE()");

  const result = await query<StadiumData>(
    `
    UPDATE stadiums
    SET ${fields.join(", ")}
    OUTPUT INSERTED.*
    WHERE stadium_id = @stadiumId
  `,
    params
  );

  return result.recordset[0] || null;
}

/**
 * Delete stadium (soft delete by setting is_active = 0)
 */
export async function deleteStadium(stadiumId: number): Promise<void> {
  await query(
    `
    UPDATE stadiums
    SET is_active = 0, updated_at = GETUTCDATE()
    WHERE stadium_id = @stadiumId
  `,
    { stadiumId }
  );
}

/**
 * Get stadiums by city
 */
export async function getStadiumsByCity(city: string): Promise<StadiumData[]> {
  const result = await query<StadiumData>(
    `${baseStadiumSelect} WHERE st.city = @city ORDER BY st.name ASC`,
    { city }
  );
  return result.recordset;
}

/**
 * Get stadiums by country
 */
export async function getStadiumsByCountry(country: string): Promise<StadiumData[]> {
  const result = await query<StadiumData>(
    `${baseStadiumSelect} WHERE st.country = @country ORDER BY st.city ASC`,
    { country }
  );
  return result.recordset;
}

/**
 * Check available stadiums for a match (not already booked at that time)
 */
export async function getAvailableStadiums(
  matchDate: string
): Promise<StadiumData[]> {
  const result = await query<StadiumData>(
    `
    ${baseStadiumSelect}
    WHERE st.is_active = 1
    AND st.stadium_id NOT IN (
      SELECT DISTINCT st2.stadium_id
      FROM stadiums st2
      INNER JOIN matches m ON st2.stadium_id = m.stadium_id
      WHERE CAST(m.match_date AS DATE) = @matchDate
      AND m.status != 'cancelled'
    )
    ORDER BY st.name ASC
  `,
    { matchDate }
  );
  return result.recordset;
}
