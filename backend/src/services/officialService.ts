import { query } from "../db/sqlServer";

export interface Official {
  officialId: number;
  userId: number | null;
  fullName: string;
  roleSpecialty: string;
  licenseNumber: string | null;
  federationLevel: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface CreateOfficialInput {
  userId?: number | null;
  fullName: string;
  roleSpecialty: string;
  licenseNumber?: string | null;
  federationLevel?: string | null;
  status?: string;
  notes?: string | null;
}

export interface UpdateOfficialInput {
  fullName?: string;
  roleSpecialty?: string;
  licenseNumber?: string | null;
  federationLevel?: string | null;
  status?: string;
  notes?: string | null;
}

export interface MatchOfficialAssignment {
  assignmentId: number;
  matchId: number;
  officialId: number;
  officialName: string;
  roleCode: string;
  assignedAt: Date;
  assignedBy: number;
  notes: string | null;
}

export interface AssignOfficialInput {
  matchId: number;
  officialId: number;
  roleCode: string;
  notes?: string | null;
  assignedBy: number;
}

// Role labels for display
export const ROLE_LABELS: Record<string, string> = {
  referee: "Trọng tài chính",
  assistant_1: "Trọng tài biên 1",
  assistant_2: "Trọng tài biên 2",
  fourth_official: "Trọng tài thứ 4",
  match_commissioner: "Giám sát trận đấu",
  video_assistant: "VAR",
};

export const SPECIALTY_LABELS: Record<string, string> = {
  referee: "Trọng tài chính",
  assistant: "Trọng tài biên",
  fourth_official: "Trọng tài thứ 4",
  match_commissioner: "Giám sát trận đấu",
  supervisor: "Giám sát viên",
  var: "VAR",
  other: "Khác",
};

/**
 * List all officials with optional filters
 */
export async function listOfficials(filters?: {
  status?: string;
  roleSpecialty?: string;
  search?: string;
}): Promise<Official[]> {
  let whereConditions = ["1=1"];
  const params: Record<string, any> = {};

  if (filters?.status) {
    whereConditions.push("status = @status");
    params.status = filters.status;
  }

  if (filters?.roleSpecialty) {
    whereConditions.push("role_specialty = @roleSpecialty");
    params.roleSpecialty = filters.roleSpecialty;
  }

  if (filters?.search) {
    whereConditions.push("(full_name LIKE @search OR license_number LIKE @search)");
    params.search = `%${filters.search}%`;
  }

  const result = await query<{
    official_id: number;
    user_id: number | null;
    full_name: string;
    role_specialty: string;
    license_number: string | null;
    federation_level: string | null;
    status: string;
    notes: string | null;
    created_at: Date;
    updated_at: Date | null;
  }>(
    `SELECT 
      official_id, user_id, full_name, role_specialty,
      license_number, federation_level, status, notes,
      created_at, updated_at
     FROM officials
     WHERE ${whereConditions.join(" AND ")}
     ORDER BY full_name`,
    params
  );

  return result.recordset.map((row) => ({
    officialId: row.official_id,
    userId: row.user_id,
    fullName: row.full_name,
    roleSpecialty: row.role_specialty,
    licenseNumber: row.license_number,
    federationLevel: row.federation_level,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Get official by ID
 */
export async function getOfficialById(officialId: number): Promise<Official | null> {
  const result = await query<{
    official_id: number;
    user_id: number | null;
    full_name: string;
    role_specialty: string;
    license_number: string | null;
    federation_level: string | null;
    status: string;
    notes: string | null;
    created_at: Date;
    updated_at: Date | null;
  }>(
    `SELECT * FROM officials WHERE official_id = @officialId`,
    { officialId }
  );

  if (result.recordset.length === 0) return null;

  const row = result.recordset[0];
  return {
    officialId: row.official_id,
    userId: row.user_id,
    fullName: row.full_name,
    roleSpecialty: row.role_specialty,
    licenseNumber: row.license_number,
    federationLevel: row.federation_level,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create a new official
 */
export async function createOfficial(input: CreateOfficialInput): Promise<Official> {
  const result = await query<{ official_id: number }>(
    `INSERT INTO officials (user_id, full_name, role_specialty, license_number, federation_level, status, notes)
     OUTPUT INSERTED.official_id
     VALUES (@userId, @fullName, @roleSpecialty, @licenseNumber, @federationLevel, @status, @notes)`,
    {
      userId: input.userId ?? null,
      fullName: input.fullName,
      roleSpecialty: input.roleSpecialty,
      licenseNumber: input.licenseNumber ?? null,
      federationLevel: input.federationLevel ?? null,
      status: input.status ?? "active",
      notes: input.notes ?? null,
    }
  );

  const officialId = result.recordset[0].official_id;
  return (await getOfficialById(officialId))!;
}

/**
 * Update an official
 */
export async function updateOfficial(
  officialId: number,
  input: UpdateOfficialInput
): Promise<Official | null> {
  const setClauses: string[] = ["updated_at = SYSUTCDATETIME()"];
  const params: Record<string, any> = { officialId };

  if (input.fullName !== undefined) {
    setClauses.push("full_name = @fullName");
    params.fullName = input.fullName;
  }
  if (input.roleSpecialty !== undefined) {
    setClauses.push("role_specialty = @roleSpecialty");
    params.roleSpecialty = input.roleSpecialty;
  }
  if (input.licenseNumber !== undefined) {
    setClauses.push("license_number = @licenseNumber");
    params.licenseNumber = input.licenseNumber;
  }
  if (input.federationLevel !== undefined) {
    setClauses.push("federation_level = @federationLevel");
    params.federationLevel = input.federationLevel;
  }
  if (input.status !== undefined) {
    setClauses.push("status = @status");
    params.status = input.status;
  }
  if (input.notes !== undefined) {
    setClauses.push("notes = @notes");
    params.notes = input.notes;
  }

  await query(
    `UPDATE officials SET ${setClauses.join(", ")} WHERE official_id = @officialId`,
    params
  );

  return getOfficialById(officialId);
}

/**
 * Delete an official
 */
export async function deleteOfficial(officialId: number): Promise<boolean> {
  const result = await query(
    `DELETE FROM officials WHERE official_id = @officialId`,
    { officialId }
  );
  return (result.rowsAffected?.[0] ?? 0) > 0;
}

/**
 * Get match official assignments for a match
 */
export async function getMatchOfficials(matchId: number): Promise<MatchOfficialAssignment[]> {
  const result = await query<{
    match_official_assignment_id: number;
    match_id: number;
    official_id: number;
    full_name: string;
    role_code: string;
    assigned_at: Date;
    assigned_by: number;
    notes: string | null;
  }>(
    `SELECT 
      moa.match_official_assignment_id,
      moa.match_id,
      moa.official_id,
      o.full_name,
      moa.role_code,
      moa.assigned_at,
      moa.assigned_by,
      moa.notes
     FROM match_official_assignments moa
     INNER JOIN officials o ON moa.official_id = o.official_id
     WHERE moa.match_id = @matchId
     ORDER BY 
       CASE moa.role_code 
         WHEN 'referee' THEN 1
         WHEN 'assistant_1' THEN 2
         WHEN 'assistant_2' THEN 3
         WHEN 'fourth_official' THEN 4
         WHEN 'match_commissioner' THEN 5
         WHEN 'video_assistant' THEN 6
       END`,
    { matchId }
  );

  return result.recordset.map((row) => ({
    assignmentId: row.match_official_assignment_id,
    matchId: row.match_id,
    officialId: row.official_id,
    officialName: row.full_name,
    roleCode: row.role_code,
    assignedAt: row.assigned_at,
    assignedBy: row.assigned_by,
    notes: row.notes,
  }));
}

/**
 * Assign an official to a match
 */
export async function assignOfficialToMatch(
  input: AssignOfficialInput
): Promise<MatchOfficialAssignment> {
  const result = await query<{ match_official_assignment_id: number }>(
    `INSERT INTO match_official_assignments (match_id, official_id, role_code, assigned_by, notes)
     OUTPUT INSERTED.match_official_assignment_id
     VALUES (@matchId, @officialId, @roleCode, @assignedBy, @notes)`,
    {
      matchId: input.matchId,
      officialId: input.officialId,
      roleCode: input.roleCode,
      assignedBy: input.assignedBy,
      notes: input.notes ?? null,
    }
  );

  const assignments = await getMatchOfficials(input.matchId);
  return assignments.find(
    (a) => a.assignmentId === result.recordset[0].match_official_assignment_id
  )!;
}

/**
 * Remove an official assignment from a match
 */
export async function removeOfficialFromMatch(
  matchId: number,
  roleCode: string
): Promise<boolean> {
  const result = await query(
    `DELETE FROM match_official_assignments 
     WHERE match_id = @matchId AND role_code = @roleCode`,
    { matchId, roleCode }
  );
  return (result.rowsAffected?.[0] ?? 0) > 0;
}

/**
 * Update official assignment for a match
 */
export async function updateMatchOfficialAssignment(
  matchId: number,
  roleCode: string,
  officialId: number,
  assignedBy: number,
  notes?: string
): Promise<MatchOfficialAssignment | null> {
  // Use MERGE to upsert
  await query(
    `MERGE match_official_assignments AS target
     USING (SELECT @matchId AS match_id, @roleCode AS role_code) AS source
     ON target.match_id = source.match_id AND target.role_code = source.role_code
     WHEN MATCHED THEN
       UPDATE SET official_id = @officialId, assigned_by = @assignedBy, 
                  assigned_at = SYSUTCDATETIME(), notes = @notes
     WHEN NOT MATCHED THEN
       INSERT (match_id, official_id, role_code, assigned_by, notes)
       VALUES (@matchId, @officialId, @roleCode, @assignedBy, @notes);`,
    { matchId, roleCode, officialId, assignedBy, notes: notes ?? null }
  );

  const assignments = await getMatchOfficials(matchId);
  return assignments.find((a) => a.roleCode === roleCode) || null;
}

/**
 * Get available officials for a specific role
 */
export async function getAvailableOfficialsForRole(
  roleCode: string
): Promise<Official[]> {
  // Map role_code to specialty
  const specialtyMap: Record<string, string[]> = {
    referee: ["referee"],
    assistant_1: ["assistant", "referee"],
    assistant_2: ["assistant", "referee"],
    fourth_official: ["fourth_official", "referee", "assistant"],
    match_commissioner: ["match_commissioner", "supervisor"],
    video_assistant: ["var", "referee"],
  };

  const specialties = specialtyMap[roleCode] || ["other"];

  const result = await query<{
    official_id: number;
    user_id: number | null;
    full_name: string;
    role_specialty: string;
    license_number: string | null;
    federation_level: string | null;
    status: string;
    notes: string | null;
    created_at: Date;
    updated_at: Date | null;
  }>(
    `SELECT * FROM officials 
     WHERE status = 'active' 
       AND role_specialty IN (${specialties.map((_, i) => `@spec${i}`).join(",")})
     ORDER BY full_name`,
    specialties.reduce((acc, spec, i) => ({ ...acc, [`spec${i}`]: spec }), {})
  );

  return result.recordset.map((row) => ({
    officialId: row.official_id,
    userId: row.user_id,
    fullName: row.full_name,
    roleSpecialty: row.role_specialty,
    licenseNumber: row.license_number,
    federationLevel: row.federation_level,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

