import { query } from "../db/sqlServer";

/**
 * Get official assigned to a user
 */
export async function getUserOfficial(userId: number) {
  const result = await query<{
    official_id: number;
    full_name: string;
    role_specialty: string;
    license_number: string | null;
    federation_level: string | null;
    status: string;
  }>(
    `
    SELECT 
      o.official_id,
      o.full_name,
      o.role_specialty,
      o.license_number,
      o.federation_level,
      o.status
    FROM officials o
    WHERE o.user_id = @userId
    `,
    { userId }
  );

  if (result.recordset.length === 0) {
    return null;
  }

  const official = result.recordset[0];
  return {
    official_id: official.official_id,
    full_name: official.full_name,
    role_specialty: official.role_specialty,
    license_number: official.license_number,
    federation_level: official.federation_level,
    status: official.status,
  };
}

/**
 * Assign official to user
 */
export async function assignOfficialToUser(
  userId: number,
  officialId: number,
  assignedBy: number
) {
  // Check if official exists
  const officialCheck = await query<{ official_id: number; user_id: number | null }>(
    `SELECT official_id, user_id FROM officials WHERE official_id = @officialId`,
    { officialId }
  );

  if (officialCheck.recordset.length === 0) {
    throw new Error("Official not found");
  }

  const official = officialCheck.recordset[0];

  // Check if official is already assigned to another user
  if (official.user_id && official.user_id !== userId) {
    throw new Error("Official is already assigned to another user");
  }

  // Update official with user_id
  await query(
    `
    UPDATE officials
    SET user_id = @userId,
        updated_at = SYSUTCDATETIME()
    WHERE official_id = @officialId
    `,
    { userId, officialId }
  );

  return { success: true };
}

/**
 * Remove official from user
 */
export async function removeOfficialFromUser(
  userId: number,
  removedBy: number
) {
  // Check if user has an official assigned
  const check = await query<{ official_id: number }>(
    `SELECT official_id FROM officials WHERE user_id = @userId`,
    { userId }
  );

  if (check.recordset.length === 0) {
    throw new Error("No official assigned to this user");
  }

  // Remove user_id from official
  await query(
    `
    UPDATE officials
    SET user_id = NULL,
        updated_at = SYSUTCDATETIME()
    WHERE user_id = @userId
    `,
    { userId }
  );

  return { success: true };
}


