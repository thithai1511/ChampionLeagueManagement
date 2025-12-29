import { query } from "../db/sqlServer";

export interface ParticipationFee {
  fee_id: number;
  season_id: number;
  team_id: number;
  team_name: string;
  fee_amount: number;
  currency: string;
  due_date: string;
  paid_at: string | null;
  is_paid: boolean;
  payment_method: string | null;
  payment_reference: string | null;
  created_at: string;
}

/**
 * Create participation fee record for team
 */
export async function createParticipationFee(
  seasonId: number,
  teamId: number,
  feeAmount: number,
  dueDate: string,
  currency: string = "VND"
): Promise<ParticipationFee> {
  const result = await query<ParticipationFee>(
    `
    INSERT INTO participation_fees (season_id, team_id, fee_amount, currency, due_date, is_paid, created_at)
    OUTPUT INSERTED.*
    VALUES (@seasonId, @teamId, @feeAmount, @currency, @dueDate, 0, GETUTCDATE())
  `,
    {
      seasonId,
      teamId,
      feeAmount,
      currency,
      dueDate,
    }
  );

  const fee = result.recordset[0];
  const team = await query<{ name: string }>(
    `SELECT name FROM teams WHERE team_id = @teamId`,
    { teamId }
  );

  return {
    ...fee,
    team_name: team.recordset[0]?.name || "",
  };
}

/**
 * Get participation fee for team in season
 */
export async function getParticipationFee(
  seasonId: number,
  teamId: number
): Promise<ParticipationFee | null> {
  const result = await query<ParticipationFee>(
    `
    SELECT
      pf.fee_id,
      pf.season_id,
      pf.team_id,
      t.name AS team_name,
      pf.fee_amount,
      pf.currency,
      CONVERT(VARCHAR(10), pf.due_date, 23) AS due_date,
      CONVERT(VARCHAR(23), pf.paid_at, 126) AS paid_at,
      pf.is_paid,
      pf.payment_method,
      pf.payment_reference,
      CONVERT(VARCHAR(23), pf.created_at, 126) AS created_at
    FROM participation_fees pf
    INNER JOIN teams t ON pf.team_id = t.team_id
    WHERE pf.season_id = @seasonId AND pf.team_id = @teamId
  `,
    { seasonId, teamId }
  );

  return result.recordset[0] || null;
}

/**
 * Mark fee as paid
 */
export async function markFeeAsPaid(
  feeId: number,
  paymentMethod: string,
  paymentReference: string
): Promise<void> {
  await query(
    `
    UPDATE participation_fees
    SET is_paid = 1, paid_at = GETUTCDATE(), payment_method = @paymentMethod, payment_reference = @paymentReference
    WHERE fee_id = @feeId
  `,
    { feeId, paymentMethod, paymentReference }
  );
}

/**
 * Get all fees for a season (both paid and unpaid)
 */
export async function getAllFeesForSeason(seasonId: number): Promise<ParticipationFee[]> {
  const result = await query<ParticipationFee>(
    `
    SELECT
      pf.fee_id,
      pf.season_id,
      pf.team_id,
      t.name AS team_name,
      pf.fee_amount,
      pf.currency,
      CONVERT(VARCHAR(10), pf.due_date, 23) AS due_date,
      CONVERT(VARCHAR(23), pf.paid_at, 126) AS paid_at,
      pf.is_paid,
      pf.payment_method,
      pf.payment_reference,
      CONVERT(VARCHAR(23), pf.created_at, 126) AS created_at
    FROM participation_fees pf
    INNER JOIN teams t ON pf.team_id = t.team_id
    WHERE pf.season_id = @seasonId
    ORDER BY pf.is_paid ASC, pf.due_date ASC
  `,
    { seasonId }
  );

  return result.recordset;
}

/**
 * Get unpaid fees for a season
 */
export async function getUnpaidFees(seasonId: number): Promise<ParticipationFee[]> {
  const result = await query<ParticipationFee>(
    `
    SELECT
      pf.fee_id,
      pf.season_id,
      pf.team_id,
      t.name AS team_name,
      pf.fee_amount,
      pf.currency,
      CONVERT(VARCHAR(10), pf.due_date, 23) AS due_date,
      CONVERT(VARCHAR(23), pf.paid_at, 126) AS paid_at,
      pf.is_paid,
      pf.payment_method,
      pf.payment_reference,
      CONVERT(VARCHAR(23), pf.created_at, 126) AS created_at
    FROM participation_fees pf
    INNER JOIN teams t ON pf.team_id = t.team_id
    WHERE pf.season_id = @seasonId AND pf.is_paid = 0
    ORDER BY pf.due_date ASC
  `,
    { seasonId }
  );

  return result.recordset;
}

/**
 * Get overdue fees
 */
export async function getOverdueFees(seasonId: number): Promise<ParticipationFee[]> {
  const result = await query<ParticipationFee>(
    `
    SELECT
      pf.fee_id,
      pf.season_id,
      pf.team_id,
      t.name AS team_name,
      pf.fee_amount,
      pf.currency,
      CONVERT(VARCHAR(10), pf.due_date, 23) AS due_date,
      CONVERT(VARCHAR(23), pf.paid_at, 126) AS paid_at,
      pf.is_paid,
      pf.payment_method,
      pf.payment_reference,
      CONVERT(VARCHAR(23), pf.created_at, 126) AS created_at
    FROM participation_fees pf
    INNER JOIN teams t ON pf.team_id = t.team_id
    WHERE pf.season_id = @seasonId AND pf.is_paid = 0 AND pf.due_date < GETDATE()
    ORDER BY pf.due_date ASC
  `,
    { seasonId }
  );

  return result.recordset;
}

/**
 * Get fee payment statistics for season
 */
export async function getFeePaymentStatistics(seasonId: number): Promise<{
  total_teams: number;
  paid_teams: number;
  unpaid_teams: number;
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  payment_rate: number;
}> {
  const result = await query<{
    total_teams: number;
    paid_teams: number;
    unpaid_teams: number;
    total_amount: number;
    paid_amount: number;
    unpaid_amount: number;
  }>(
    `
    SELECT
      COUNT(*) AS total_teams,
      SUM(CASE WHEN is_paid = 1 THEN 1 ELSE 0 END) AS paid_teams,
      SUM(CASE WHEN is_paid = 0 THEN 1 ELSE 0 END) AS unpaid_teams,
      SUM(fee_amount) AS total_amount,
      SUM(CASE WHEN is_paid = 1 THEN fee_amount ELSE 0 END) AS paid_amount,
      SUM(CASE WHEN is_paid = 0 THEN fee_amount ELSE 0 END) AS unpaid_amount
    FROM participation_fees
    WHERE season_id = @seasonId
  `,
    { seasonId }
  );

  const stats = result.recordset[0] || {
    total_teams: 0,
    paid_teams: 0,
    unpaid_teams: 0,
    total_amount: 0,
    paid_amount: 0,
    unpaid_amount: 0,
  };

  return {
    ...stats,
    payment_rate:
      stats.total_teams > 0 ? (stats.paid_teams / stats.total_teams) * 100 : 0,
  };
}

/**
 * Enforce payment requirement - prevent team from participating if fee not paid
 */
export async function canTeamParticipate(
  seasonId: number,
  teamId: number
): Promise<{ allowed: boolean; reason?: string }> {
  const feeStatus = await getParticipationFee(seasonId, teamId);

  if (!feeStatus) {
    return {
      allowed: false,
      reason: "No participation fee record found",
    };
  }

  if (!feeStatus.is_paid) {
    return {
      allowed: false,
      reason: `Participation fee of ${feeStatus.fee_amount} ${feeStatus.currency} is not paid. Due date: ${feeStatus.due_date}`,
    };
  }

  return { allowed: true };
}
