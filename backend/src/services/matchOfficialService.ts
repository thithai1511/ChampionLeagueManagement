import { query } from "../db/sqlServer";

export interface MatchOfficial {
  assignment_id: number;
  match_id: number;
  official_id: number;
  official_name: string;
  roleCode: "referee" | "assistant_1" | "assistant_2" | "fourth_official" | "video_assistant" | "match_commissioner";
  assigned_at: string;
  assigned_by_user_id: number;
  created_at: string;
}

const baseAssignmentSelect = `
  SELECT
    moa.match_official_assignment_id AS assignment_id,
    moa.match_id,
    moa.official_id,
    o.full_name AS official_name,
    moa.role_code AS roleCode,
    CONVERT(VARCHAR(23), moa.assigned_at, 126) AS assigned_at,
    moa.assigned_by AS assigned_by_user_id,
    CONVERT(VARCHAR(23), moa.assigned_at, 126) AS created_at
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
  const result = await query<{
    match_official_assignment_id: number;
    match_id: number;
    official_id: number;
    role_code: string;
    assigned_at: Date;
    assigned_by: number;
  }>(
    `
    INSERT INTO match_official_assignments (match_id, official_id, role_code, assigned_at, assigned_by)
    OUTPUT INSERTED.match_official_assignment_id, INSERTED.match_id, INSERTED.official_id, INSERTED.role_code, INSERTED.assigned_at, INSERTED.assigned_by
    VALUES (@matchId, @officialId, @role, SYSUTCDATETIME(), @assignedByUserId)
  `,
    {
      matchId,
      officialId,
      role,
      assignedByUserId,
    }
  );

  const record = result.recordset[0];
  if (!record) {
    throw new Error("Failed to create assignment");
  }
  
  // Get official name
  const officialResult = await query<{ full_name: string }>(
    `SELECT full_name FROM officials WHERE official_id = @officialId`,
    { officialId }
  );
  const officialName = officialResult.recordset[0]?.full_name || '';
  
  return {
    assignment_id: record.match_official_assignment_id,
    match_id: record.match_id,
    official_id: record.official_id,
    official_name: officialName,
    roleCode: record.role_code as any,
    assigned_at: record.assigned_at.toISOString(),
    assigned_by_user_id: record.assigned_by,
    created_at: record.assigned_at.toISOString()
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
  // Update notes if provided (no confirmation columns in schema)
  if (notes) {
    await query(
      `
      UPDATE match_official_assignments
      SET notes = @notes
      WHERE match_official_assignment_id = @assignmentId
    `,
      { assignmentId, notes }
    );
  }
}

/**
 * Cancel assignment
 */
export async function cancelAssignment(assignmentId: number): Promise<void> {
  await query(
    `
    DELETE FROM match_official_assignments
    WHERE match_official_assignment_id = @assignmentId
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

/**
 * Auto assign officials to a match (Super Admin only)
 * Randomly selects available officials for each role
 */
export async function autoAssignOfficials(
  matchId: number,
  assignedByUserId: number
): Promise<{
  assigned: MatchOfficial[];
  skipped: string[];
}> {
  // Get current assignments
  const existing = await getMatchOfficials(matchId);
  const assignedRoles = new Set(existing.map(a => a.roleCode));
  
  // Required roles
  const requiredRoles: Array<{
    role: "referee" | "assistant_1" | "assistant_2" | "fourth_official" | "video_assistant" | "match_commissioner";
    specialty: string[];
  }> = [
    { role: "referee", specialty: ["referee"] },
    { role: "assistant_1", specialty: ["assistant", "referee"] },
    { role: "assistant_2", specialty: ["assistant", "referee"] },
    { role: "fourth_official", specialty: ["fourth_official", "referee", "assistant"] },
  ];

  const assigned: MatchOfficial[] = [];
  const skipped: string[] = [];
  const usedOfficialIds = new Set<number>();

  for (const { role, specialty } of requiredRoles) {
    // Skip if already assigned
    if (assignedRoles.has(role)) {
      continue;
    }

    // Get available officials for this role
    // Build dynamic IN clause safely
    const specialtyParams: Record<string, string> = {};
    specialty.forEach((spec, i) => {
      specialtyParams[`spec${i}`] = spec;
    });
    
    const inClause = specialty.map((_, i) => `@spec${i}`).join(",");
    
    const available = await query<{
      official_id: number;
      full_name: string;
      role_specialty: string;
    }>(
      `SELECT o.official_id, o.full_name, o.role_specialty
       FROM officials o
       WHERE o.status = 'active'
         AND o.role_specialty IN (${inClause})
         AND o.official_id NOT IN (
           SELECT moa.official_id
           FROM match_official_assignments moa
           WHERE moa.match_id = @matchId
         )
       ORDER BY NEWID()`,
      { ...specialtyParams, matchId }
    );

    if (available.recordset.length === 0) {
      skipped.push(`${role}: Không có trọng tài khả dụng`);
      continue;
    }

    // Find first available official not used in this batch
    const candidate = available.recordset.find(o => !usedOfficialIds.has(o.official_id));
    
    if (!candidate) {
      skipped.push(`${role}: Tất cả trọng tài đã được phân công`);
      continue;
    }

    // Assign - check for duplicate first
    try {
      const assignment = await assignOfficialToMatch(
        matchId,
        candidate.official_id,
        role,
        assignedByUserId
      );
      assigned.push(assignment);
      usedOfficialIds.add(candidate.official_id);
    } catch (error: any) {
      // Handle duplicate assignment error
      if (error.message?.includes('duplicate') || error.message?.includes('UNIQUE') || error.number === 2627) {
        skipped.push(`${role}: Trọng tài đã được phân công cho trận này`);
        continue;
      }
      throw error; // Re-throw if it's a different error
    }
  }

  // Update officials_assigned_at timestamp
  if (assigned.length > 0) {
    await query(
      `UPDATE matches 
       SET officials_assigned_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME() 
       WHERE match_id = @matchId`,
      { matchId }
    );
  }

  return { assigned, skipped };
}