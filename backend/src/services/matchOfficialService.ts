import { query } from "../db/sqlServer";

export interface MatchOfficial {
  assignment_id: number;
  match_id: number;
  official_id: number;
  official_name: string;
  roleCode: "referee" | "assistant_1" | "assistant_2" | "fourth_official" | "video_assistant" | "match_commissioner";
  assigned_at: string;
  assigned_by_user_id: number;
  is_confirmed: boolean;
  confirmed_at: string | null;
  confirmation_notes: string | null;
  created_at: string;
}

const baseAssignmentSelect = `
  SELECT
    moa.assignment_id,
    moa.match_id,
    moa.official_id,
    o.full_name AS official_name,
    moa.role_code AS roleCode,
    CONVERT(VARCHAR(23), moa.assigned_at, 126) AS assigned_at,
    moa.assigned_by_user_id,
    moa.is_confirmed,
    CONVERT(VARCHAR(23), moa.confirmed_at, 126) AS confirmed_at,
    moa.confirmation_notes,
    CONVERT(VARCHAR(23), moa.created_at, 126) AS created_at
  FROM match_official_assignments moa
  INNER JOIN officials o ON moa.official_id = o.official_id
`;

/**
 * Assign official to match
 */
export async function assignOfficialToMatch(
  matchId: number,
  officialId: number,
  role: "referee" | "assistant_1" | "assistant_2" | "fourth_official" | "video_assistant" | "match_commissioner",
  assignedByUserId: number
): Promise<MatchOfficial> {
  const result = await query<MatchOfficial>(
    `
    INSERT INTO match_official_assignments (match_id, official_id, role_code, assigned_at, assigned_by_user_id, is_confirmed, created_at)
    OUTPUT INSERTED.*
    VALUES (@matchId, @officialId, @role, GETUTCDATE(), @assignedByUserId, 0, GETUTCDATE())
  `,
    {
      matchId,
      officialId,
      role,
      assignedByUserId,
    }
  );

  const record = result.recordset[0];
  return {
    ...record,
    roleCode: (record as any).role_code
  };
}

/**
 * Get all assignments for a match
 */
export async function getMatchOfficials(matchId: number): Promise<MatchOfficial[]> {
  const result = await query<MatchOfficial>(
    `${baseAssignmentSelect} WHERE moa.match_id = @matchId ORDER BY moa.role_code ASC`,
    { matchId }
  );
  return result.recordset;
}

/**
 * Get all assignments for an official
 */
export async function getOfficialAssignments(officialId: number): Promise<MatchOfficial[]> {
  const result = await query<MatchOfficial>(
    `${baseAssignmentSelect} WHERE moa.official_id = @officialId ORDER BY moa.assigned_at DESC`,
    { officialId }
  );
  return result.recordset;
}

/**
 * Get pending confirmations (unconfirmed assignments)
 */
export async function getPendingConfirmations(): Promise<MatchOfficial[]> {
  const result = await query<MatchOfficial>(
    `${baseAssignmentSelect} WHERE moa.is_confirmed = 0 ORDER BY moa.assigned_at ASC`
  );
  return result.recordset;
}

/**
 * Confirm assignment
 */
export async function confirmAssignment(
  assignmentId: number,
  notes?: string
): Promise<void> {
  await query(
    `
    UPDATE match_official_assignments
    SET is_confirmed = 1, confirmed_at = GETUTCDATE(), confirmation_notes = @notes
    WHERE assignment_id = @assignmentId
  `,
    { assignmentId, notes: notes || null }
  );
}

/**
 * Cancel assignment
 */
export async function cancelAssignment(assignmentId: number): Promise<void> {
  await query(
    `
    DELETE FROM match_official_assignments
    WHERE assignment_id = @assignmentId
  `,
    { assignmentId }
  );
}

/**
 * Check if official is available for a match (no conflicts)
 */
export async function isOfficialAvailable(
  officialId: number,
  matchId: number
): Promise<boolean> {
  const result = await query<{ conflict_count: number }>(
    `
    SELECT COUNT(*) AS conflict_count
    FROM match_official_assignments moa
    INNER JOIN matches m ON moa.match_id = m.match_id
    INNER JOIN matches m2 ON m.match_date = m2.match_date
    WHERE moa.official_id = @officialId
    AND m2.match_id = @matchId
    AND moa.match_id != @matchId
  `,
    { officialId, matchId }
  );

  return result.recordset[0]?.conflict_count === 0;
}

/**
 * Get officials available for a match
 */
export async function getAvailableOfficials(matchId: number): Promise<any[]> {
  const result = await query(
    `
    SELECT o.*
    FROM officials o
    WHERE o.is_active = 1
    AND o.official_id NOT IN (
      SELECT moa.official_id
      FROM match_official_assignments moa
      WHERE moa.match_id = @matchId
    )
    ORDER BY o.full_name ASC
  `,
    { matchId }
  );

  return result.recordset;
}

/**
 * Update assignment role
 */
export async function updateAssignmentRole(
  assignmentId: number,
  newRole: "referee" | "assistant_1" | "assistant_2" | "fourth_official" | "video_assistant" | "match_commissioner"
): Promise<void> {
  await query(
    `
    UPDATE match_official_assignments
    SET role_code = @newRole
    WHERE assignment_id = @assignmentId
  `,
    { assignmentId, newRole }
  );
}

/**
 * Batch assign officials to match
 */
export async function batchAssignOfficials(
  matchId: number,
  assignments: Array<{
    officialId: number;
    role: "referee" | "assistant_1" | "assistant_2" | "fourth_official" | "video_assistant" | "match_commissioner";
  }>,
  assignedByUserId: number
): Promise<MatchOfficial[]> {
  const results: MatchOfficial[] = [];

  for (const assignment of assignments) {
    const result = await assignOfficialToMatch(
      matchId,
      assignment.officialId,
      assignment.role,
      assignedByUserId
    );
    results.push(result);
  }

  return results;
}
