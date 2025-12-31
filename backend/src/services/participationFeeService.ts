import { query } from "../db/sqlServer";

export interface SeasonRegistration {
  registration_id: number;
  season_id: number;
  team_id: number;
  fee_status: 'waived' | 'paid' | 'pending' | 'unpaid';
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: number | null;
  review_notes: string | null;
  submission_data: any; // JSON
  created_at: string;
}

/**
 * Get registration for MY team (helper)
 * Returns the latest registration for the season
 */
export async function getMyFee(
  seasonId: number,
  teamId: number
): Promise<SeasonRegistration | null> {
  // Ordered by created_at DESC to get the latest one
  console.log(`[ParticipationFee] getMyFee called for seasonId=${seasonId}, teamId=${teamId}`);

  const result = await query<SeasonRegistration>(
    `
    SELECT TOP 1
        registration_id,
        season_id,
        team_id,
        fee_status,
        registration_status,
        CONVERT(VARCHAR(23), submitted_at, 126) as submitted_at,
        CONVERT(VARCHAR(23), reviewed_at, 126) as reviewed_at,
        reviewed_by,
        review_notes,
        submission_data,
        CONVERT(VARCHAR(23), created_at, 126) as created_at
    FROM season_team_registrations
    WHERE season_id = @seasonId AND team_id = @teamId
    ORDER BY created_at DESC
    `,
    { seasonId, teamId }
  );

  const reg = result.recordset[0];
  console.log(`[ParticipationFee] getMyFee result for seasonId=${seasonId}, teamId=${teamId}:`, reg ? 'Found' : 'Not Found');

  if (!reg) return null;

  // Safe parse submission_data
  if (typeof reg.submission_data === 'string') {
    try {
      reg.submission_data = JSON.parse(reg.submission_data);
    } catch (e) {
      console.error('[ParticipationFee] Failed to parse submission_data JSON:', e);
      reg.submission_data = {};
    }
  }

  return reg;
}

/**
 * Submit fee with transaction code (Team Action)
 * Guard: Only if fee_status = 'unpaid'
 */
export async function submitFee(
  registrationId: number,
  teamId: number,
  transactionCode: string,
  teamNote: string,
  evidenceUrl?: string
): Promise<void> {
  // 1. Check ownership & current status
  const current = await query<SeasonRegistration>(
    `SELECT team_id, fee_status, submission_data FROM season_team_registrations WHERE registration_id = @registrationId`,
    { registrationId }
  );

  const reg = current.recordset[0];
  if (!reg) throw new Error("Registration record not found");
  if (reg.team_id !== teamId) throw new Error("Unauthorized to submit for this team");

  if (reg.fee_status !== 'unpaid') {
    throw new Error(`Cannot submit fee from status: ${reg.fee_status}. Only 'unpaid' allowed.`);
  }

  // 2. Prepare JSON merge
  let currentData = {};
  if (typeof reg.submission_data === 'string') {
    try { currentData = JSON.parse(reg.submission_data); } catch (e) { }
  } else if (reg.submission_data) {
    currentData = reg.submission_data;
  }

  const newData = {
    ...currentData,
    payment: {
      transaction_code: transactionCode,
      team_note: teamNote,
      evidence_url: evidenceUrl || null
    }
  };

  // 3. Update
  await query(
    `
    UPDATE season_team_registrations
    SET 
      fee_status = 'pending',
      submitted_at = SYSUTCDATETIME(),
      review_notes = NULL,
      reviewed_at = NULL,
      reviewed_by = NULL,
      submission_data = @submissionData
    WHERE registration_id = @registrationId
    `,
    {
      registrationId,
      submissionData: JSON.stringify(newData)
    }
  );
}

/**
 * Approve Fee (Admin Action)
 * Guard: Only if pending
 */
export async function approveFee(registrationId: number, adminId: number): Promise<void> {
  const current = await query<SeasonRegistration>(
    `SELECT fee_status FROM season_team_registrations WHERE registration_id = @registrationId`,
    { registrationId }
  );
  const reg = current.recordset[0];

  if (!reg) throw new Error("Registration record not found");
  if (reg.fee_status !== 'pending') {
    throw new Error(`Cannot approve fee in status: ${reg.fee_status}`);
  }

  await query(
    `
    UPDATE season_team_registrations
    SET 
      fee_status = 'paid',
      registration_status = 'APPROVED',
      reviewed_at = SYSUTCDATETIME(),
      reviewed_by = @adminId,
      review_notes = NULL
    WHERE registration_id = @registrationId
    `,
    { registrationId, adminId }
  );
}

/**
 * Reject Fee (Admin Action)
 * Guard: Only if pending
 */
export async function rejectFee(registrationId: number, adminId: number, reason: string): Promise<void> {
  const current = await query<SeasonRegistration>(
    `SELECT fee_status FROM season_team_registrations WHERE registration_id = @registrationId`,
    { registrationId }
  );
  const reg = current.recordset[0];

  if (!reg) throw new Error("Registration record not found");
  if (reg.fee_status !== 'pending') {
    throw new Error(`Cannot reject fee in status: ${reg.fee_status}`);
  }

  await query(
    `
    UPDATE season_team_registrations
    SET 
      fee_status = 'unpaid',
      reviewed_at = SYSUTCDATETIME(),
      reviewed_by = @adminId,
      review_notes = @reason
    WHERE registration_id = @registrationId
    `,
    { registrationId, adminId, reason }
  );
}

export async function canTeamParticipate(seasonId: number, teamId: number): Promise<{ allowed: boolean; reason?: string }> {
  const fee = await getMyFee(seasonId, teamId);
  if (!fee) return { allowed: false, reason: 'Registration not found' };

  if (fee.fee_status === 'paid' || fee.fee_status === 'waived') {
    return { allowed: true };
  }

  return { allowed: false, reason: `Fee status is ${fee.fee_status}` };
}
