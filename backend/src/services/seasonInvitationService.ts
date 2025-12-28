import { query } from "../db/sqlServer";

// Extended statuses for multi-phase workflow
// draft: Not yet sent
// sent: Sent, awaiting response
// accepted: Team accepted
// rejected: Team rejected  
// expired: Deadline passed without response
// awaiting_submission: Accepted, waiting for team to submit documents
// submitted: Team submitted documents
// qualified: BTC approved documents
// disqualified: BTC rejected documents
// replaced: Team was replaced by another
export type InvitationStatus = 
  | "draft" 
  | "sent" 
  | "pending"  // Legacy, same as "sent"
  | "accepted" 
  | "rejected" 
  | "expired"
  | "awaiting_submission"
  | "submitted"
  | "qualified"
  | "disqualified"
  | "replaced";

export type InviteSource = "top8" | "promoted" | "reserve" | "manual";

export interface SeasonInvitation {
  invitation_id: number;
  season_id: number;
  team_id: number;
  team_name: string;
  short_name: string | null;
  team_logo: string | null;
  season_name: string;
  invited_by_user_id: number;
  sent_at: string;
  response_status: InvitationStatus;
  response_date: string | null;
  response_notes: string | null;
  deadline: string;
  created_at: string;
  invite_type: InviteSource;
  docs_status: "missing" | "partial" | "complete" | null;
  replacement_for_id: number | null;
}

// Map DB column names to service interface - handles both old and new schemas
const baseInvitationSelect = `
  SELECT
    si.invitation_id,
    si.season_id,
    si.team_id,
    t.name AS team_name,
    t.short_name,
    COALESCE(ft.crest, ft.logo) AS team_logo,
    s.name AS season_name,
    COALESCE(si.invited_by_user_id, si.invited_by) AS invited_by_user_id,
    CONVERT(VARCHAR(23), COALESCE(si.sent_at, si.invited_at), 126) AS sent_at,
    COALESCE(si.response_status, si.status) AS response_status,
    CONVERT(VARCHAR(23), COALESCE(si.response_date, si.responded_at), 126) AS response_date,
    si.response_notes,
    CONVERT(VARCHAR(23), COALESCE(si.deadline, si.response_deadline), 126) AS deadline,
    CONVERT(VARCHAR(23), COALESCE(si.created_at, si.invited_at), 126) AS created_at,
    COALESCE(si.invite_type, 'manual') AS invite_type,
    'missing' AS docs_status,
    si.replacement_for_id
  FROM season_invitations si
  INNER JOIN seasons s ON si.season_id = s.season_id
  INNER JOIN teams t ON si.team_id = t.team_id
  LEFT JOIN FootballTeams ft ON t.external_id = ft.id
`;

/**
 * Generate suggested invitation list for a season
 * Returns Top 8 from last season + 2 promoted teams as draft invitations
 */
export async function generateSuggestedInvitations(
  seasonId: number,
  invitedByUserId: number
): Promise<{ created: number; teams: Array<{ teamId: number; teamName: string; source: InviteSource }> }> {
  // Get previous season
  const prevSeasonResult = await query<{
    prev_season_id: number;
  }>(
    `
    SELECT TOP 1 s.season_id AS prev_season_id
    FROM seasons s
    WHERE s.tournament_id = (SELECT tournament_id FROM seasons WHERE season_id = @seasonId)
    AND s.season_id < @seasonId
    ORDER BY s.season_id DESC
  `,
    { seasonId }
  );

  const previousSeasonId = prevSeasonResult.recordset[0]?.prev_season_id;

  // Get top 8 teams from previous season standings
  const top8Result = await query<{ team_id: number; team_name: string }>(
    `
    SELECT TOP 8 stp.team_id, t.name AS team_name
    FROM season_team_statistics stp
    INNER JOIN season_team_participants stprt ON stp.season_team_id = stprt.season_team_id
    INNER JOIN teams t ON stprt.team_id = t.team_id
    WHERE stprt.season_id = @prevSeasonId
    ORDER BY stp.points DESC, (stp.goals_for - stp.goals_against) DESC
  `,
    { prevSeasonId: previousSeasonId || seasonId }
  );

  // Get 2 promoted teams (teams not in previous season)
  const promotedResult = await query<{ team_id: number; team_name: string }>(
    `
    SELECT TOP 2 t.team_id, t.name AS team_name
    FROM teams t
    WHERE t.status = 'active'
    AND t.team_id NOT IN (
      SELECT DISTINCT stprt.team_id 
      FROM season_team_participants stprt 
      WHERE stprt.season_id = @prevSeasonId
    )
    AND t.team_id NOT IN (
      SELECT team_id FROM season_invitations WHERE season_id = @seasonId
    )
    ORDER BY t.founded_year DESC, t.team_id DESC
  `,
    { prevSeasonId: previousSeasonId || seasonId, seasonId }
  );

  const teams: Array<{ teamId: number; teamName: string; source: InviteSource }> = [];
  let created = 0;

  // Create draft invitations for top 8
  for (const team of top8Result.recordset) {
    // Check if invitation already exists
    const existsResult = await query<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM season_invitations WHERE season_id = @seasonId AND team_id = @teamId`,
      { seasonId, teamId: team.team_id }
    );
    
    if (existsResult.recordset[0]?.cnt === 0) {
      // Use correct column names from schema: invited_by, status, invited_at, response_deadline
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);
      await query(
        `
        INSERT INTO season_invitations (season_id, team_id, invited_by, status, invite_type, invited_at, response_deadline)
        VALUES (@seasonId, @teamId, @invitedByUserId, 'pending', 'retained', GETUTCDATE(), @deadline)
      `,
        { seasonId, teamId: team.team_id, invitedByUserId, deadline: deadline.toISOString() }
      );
      created++;
    }
    teams.push({ teamId: team.team_id, teamName: team.team_name, source: 'top8' });
  }

  // Create draft invitations for promoted teams
  for (const team of promotedResult.recordset) {
    const existsResult = await query<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM season_invitations WHERE season_id = @seasonId AND team_id = @teamId`,
      { seasonId, teamId: team.team_id }
    );
    
    if (existsResult.recordset[0]?.cnt === 0) {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);
      await query(
        `
        INSERT INTO season_invitations (season_id, team_id, invited_by, status, invite_type, invited_at, response_deadline)
        VALUES (@seasonId, @teamId, @invitedByUserId, 'pending', 'promoted', GETUTCDATE(), @deadline)
      `,
        { seasonId, teamId: team.team_id, invitedByUserId, deadline: deadline.toISOString() }
      );
      created++;
    }
    teams.push({ teamId: team.team_id, teamName: team.team_name, source: 'promoted' });
  }

  return { created, teams };
}

/**
 * Send invitations (change status from pending to sent - for UI purposes)
 * In this schema, pending = not yet responded
 */
export async function sendInvitations(
  invitationIds: number[],
  deadlineDays: number = 14
): Promise<number> {
  // In this schema, invitations are already "sent" when created with pending status
  // This function updates the deadline
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + deadlineDays);

  const result = await query(
    `
    UPDATE season_invitations
    SET response_deadline = @deadline,
        invited_at = GETUTCDATE()
    WHERE invitation_id IN (${invitationIds.join(',')})
    AND status = 'pending'
  `,
    { deadline: deadline.toISOString() }
  );

  return result.rowsAffected?.[0] ?? 0;
}

/**
 * Send all pending invitations for a season (update deadline)
 */
export async function sendAllDraftInvitations(
  seasonId: number,
  deadlineDays: number = 14
): Promise<number> {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + deadlineDays);

  const result = await query(
    `
    UPDATE season_invitations
    SET response_deadline = @deadline,
        invited_at = GETUTCDATE()
    WHERE season_id = @seasonId
    AND status = 'pending'
  `,
    { seasonId, deadline: deadline.toISOString() }
  );

  return result.rowsAffected?.[0] ?? 0;
}

/**
 * Add a single team to invitation list (manual add)
 */
export async function addTeamToInvitations(
  seasonId: number,
  teamId: number,
  invitedByUserId: number,
  inviteType: InviteSource = 'manual'
): Promise<number> {
  // Check if already exists
  const existsResult = await query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM season_invitations WHERE season_id = @seasonId AND team_id = @teamId`,
    { seasonId, teamId }
  );
  
  if (existsResult.recordset[0]?.cnt > 0) {
    throw new Error('Đội bóng đã có trong danh sách lời mời');
  }

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 14);
  
  // Map inviteType to schema constraint values
  const dbInviteType = inviteType === 'top8' ? 'retained' : 
                       inviteType === 'reserve' ? 'replacement' : 
                       inviteType;

  const result = await query<{ invitation_id: number }>(
    `
    INSERT INTO season_invitations (season_id, team_id, invited_by, status, invite_type, invited_at, response_deadline)
    OUTPUT INSERTED.invitation_id
    VALUES (@seasonId, @teamId, @invitedByUserId, 'pending', @inviteType, GETUTCDATE(), @deadline)
  `,
    { seasonId, teamId, invitedByUserId, inviteType: dbInviteType, deadline: deadline.toISOString() }
  );

  return result.recordset[0]?.invitation_id ?? 0;
}

/**
 * Remove a pending invitation
 */
export async function removeInvitation(invitationId: number): Promise<boolean> {
  const result = await query(
    `DELETE FROM season_invitations WHERE invitation_id = @invitationId AND status = 'pending'`,
    { invitationId }
  );
  return (result.rowsAffected?.[0] ?? 0) > 0;
}

/**
 * Update invitation status for document submission flow
 * Note: docs_status may not exist in all schemas - this is for future use
 */
export async function updateDocumentStatus(
  invitationId: number,
  docsStatus: "missing" | "partial" | "complete"
): Promise<void> {
  // Update status based on document completion
  const newStatus = docsStatus === 'complete' ? 'accepted' : 'pending';
  await query(
    `
    UPDATE season_invitations
    SET status = @newStatus,
        response_notes = CONCAT(ISNULL(response_notes, ''), ' [Docs: ', @docsStatus, ']')
    WHERE invitation_id = @invitationId
  `,
    { invitationId, docsStatus, newStatus }
  );
}

/**
 * Qualify a team (BTC approval) - marks as accepted in current schema
 */
export async function qualifyTeam(invitationId: number): Promise<void> {
  await query(
    `
    UPDATE season_invitations
    SET status = 'accepted',
        responded_at = GETUTCDATE(),
        response_notes = CONCAT(ISNULL(response_notes, ''), ' [Qualified by BTC]')
    WHERE invitation_id = @invitationId
    AND status IN ('pending', 'accepted')
  `,
    { invitationId }
  );
}

/**
 * Disqualify a team (BTC rejection) - marks as declined in current schema
 */
export async function disqualifyTeam(invitationId: number, reason: string): Promise<void> {
  await query(
    `
    UPDATE season_invitations
    SET status = 'declined', 
        response_notes = @reason,
        responded_at = GETUTCDATE()
    WHERE invitation_id = @invitationId
  `,
    { invitationId, reason }
  );
}

/**
 * Create replacement invitation for a disqualified/rejected team
 */
export async function createReplacementInvitation(
  seasonId: number,
  newTeamId: number,
  replacingInvitationId: number,
  invitedByUserId: number
): Promise<number> {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7); // Shorter deadline for replacements

  // Mark original as replaced
  await query(
    `UPDATE season_invitations SET status = 'replaced' WHERE invitation_id = @replacingInvitationId`,
    { replacingInvitationId }
  );

  const result = await query<{ invitation_id: number }>(
    `
    INSERT INTO season_invitations (season_id, team_id, invited_by, status, invite_type, invited_at, response_deadline, replacement_for_id)
    OUTPUT INSERTED.invitation_id
    VALUES (@seasonId, @newTeamId, @invitedByUserId, 'pending', 'replacement', GETUTCDATE(), @deadline, @replacingInvitationId)
  `,
    { seasonId, newTeamId, invitedByUserId, deadline: deadline.toISOString(), replacingInvitationId }
  );

  return result.recordset[0]?.invitation_id ?? 0;
}

/**
 * Get reserve teams (teams not yet invited)
 */
export async function getReserveTeams(seasonId: number, limit: number = 10): Promise<Array<{ team_id: number; team_name: string }>> {
  const result = await query<{ team_id: number; team_name: string }>(
    `
    SELECT TOP (${limit}) t.team_id, t.name AS team_name
    FROM teams t
    WHERE t.status = 'active'
    AND t.team_id NOT IN (SELECT team_id FROM season_invitations WHERE season_id = @seasonId)
    ORDER BY t.founded_year DESC, t.team_id
  `,
    { seasonId }
  );
  return result.recordset;
}

/**
 * Check if season has enough qualified teams (accepted status = qualified)
 */
export async function getQualifiedCount(seasonId: number): Promise<number> {
  const result = await query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM season_invitations WHERE season_id = @seasonId AND status = 'accepted'`,
    { seasonId }
  );
  return result.recordset[0]?.cnt ?? 0;
}

/**
 * Create invitations for a season (send to 14 previous teams + 2 promoted teams)
 * @deprecated Use generateSuggestedInvitations instead for multi-phase workflow
 */
export async function createSeasonInvitations(
  seasonId: number,
  invitedByUserId: number
): Promise<void> {
  // Get 14 teams from previous season
  const prevSeasonResult = await query<{
    prev_season_id: number;
  }>(
    `
    SELECT TOP 1 s.season_id AS prev_season_id
    FROM seasons s
    WHERE s.tournament_id = (SELECT tournament_id FROM seasons WHERE season_id = @seasonId)
    AND s.season_id < @seasonId
    ORDER BY s.season_id DESC
  `,
    { seasonId }
  );

  const previousSeasonId = prevSeasonResult.recordset[0]?.prev_season_id;

  // Get top 14 teams from previous season standings or all if not available
  const prevTeamsResult = await query<{ team_id: number }>(
    `
    SELECT TOP 14 DISTINCT str.team_id
    FROM standings str
    WHERE str.season_id = @seasonId
    ORDER BY str.position ASC
  `,
    { seasonId: previousSeasonId || seasonId }
  );

  // Get promoted teams (logic: get teams from division below or last season runners-up)
  const promotedTeamsResult = await query<{ team_id: number }>(
    `
    SELECT TOP 2 t.team_id
    FROM teams t
    LEFT JOIN season_team_registrations str ON t.team_id = str.team_id AND str.season_id = @seasonId
    WHERE str.team_id IS NULL
    AND t.status = 'active'
    ORDER BY t.created_at DESC
  `,
    { seasonId }
  );

  const allInvitedTeamIds = [
    ...prevTeamsResult.recordset.map((r) => r.team_id),
    ...promotedTeamsResult.recordset.map((r) => r.team_id),
  ];

  // Remove duplicates
  const uniqueTeamIds = Array.from(new Set(allInvitedTeamIds));

  // Create invitations
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 14); // 2 weeks deadline

  for (const teamId of uniqueTeamIds) {
    await query(
      `
      INSERT INTO season_invitations (season_id, team_id, invited_by, status, invite_type, invited_at, response_deadline)
      VALUES (@seasonId, @teamId, @invitedByUserId, 'pending', 'retained', GETUTCDATE(), @deadline)
    `,
      {
        seasonId,
        teamId,
        invitedByUserId,
        deadline: deadline.toISOString(),
      }
    );
  }
}

/**
 * Get all invitations for a season
 */
export async function getSeasonInvitations(
  seasonId: number
): Promise<SeasonInvitation[]> {
  const result = await query<SeasonInvitation>(
    `${baseInvitationSelect} WHERE si.season_id = @seasonId ORDER BY si.sent_at DESC`,
    { seasonId }
  );
  return result.recordset;
}

/**
 * Get pending invitations for a team
 */
export async function getPendingInvitationsForTeam(
  teamId: number
): Promise<SeasonInvitation[]> {
  const result = await query<SeasonInvitation>(
    `${baseInvitationSelect} 
     WHERE si.team_id = @teamId 
     AND COALESCE(si.response_status, si.status) = 'pending'
     AND COALESCE(si.deadline, si.response_deadline) > GETUTCDATE()
     ORDER BY COALESCE(si.deadline, si.response_deadline) ASC`,
    { teamId }
  );
  return result.recordset;
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(
  invitationId: number,
  notes?: string
): Promise<void> {
  await query(
    `
    UPDATE season_invitations
    SET status = 'accepted', responded_at = GETUTCDATE(), response_notes = @notes
    WHERE invitation_id = @invitationId
  `,
    { invitationId, notes: notes || null }
  );
}

/**
 * Reject an invitation
 */
export async function rejectInvitation(
  invitationId: number,
  notes?: string
): Promise<void> {
  await query(
    `
    UPDATE season_invitations
    SET status = 'declined', responded_at = GETUTCDATE(), response_notes = @notes
    WHERE invitation_id = @invitationId
  `,
    { invitationId, notes: notes || null }
  );
}

/**
 * Mark expired invitations (past deadline and still pending)
 */
export async function markExpiredInvitations(): Promise<void> {
  await query(
    `
    UPDATE season_invitations
    SET status = 'expired'
    WHERE status = 'pending' AND response_deadline < GETUTCDATE()
  `
  );
}

/**
 * Get invitation details
 */
export async function getInvitationDetails(
  invitationId: number
): Promise<SeasonInvitation | null> {
  const result = await query<SeasonInvitation>(
    `${baseInvitationSelect} WHERE si.invitation_id = @invitationId`,
    { invitationId }
  );
  return result.recordset[0] || null;
}

/**
 * Get invitations status summary for a season
 */
export async function getInvitationsSummary(seasonId: number): Promise<{
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  expired: number;
}> {
  const result = await query<{
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    expired: number;
  }>(
    `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN COALESCE(response_status, status) = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN COALESCE(response_status, status) = 'accepted' THEN 1 ELSE 0 END) AS accepted,
      SUM(CASE WHEN COALESCE(response_status, status) IN ('rejected', 'declined') THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN COALESCE(response_status, status) = 'expired' THEN 1 ELSE 0 END) AS expired
    FROM season_invitations
    WHERE season_id = @seasonId
  `,
    { seasonId }
  );

  return result.recordset[0] || {
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    expired: 0,
  };
}
