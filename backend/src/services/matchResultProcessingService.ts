/**
 * matchResultProcessingService.ts
 * Service xử lý tự động sau khi trận đấu hoàn tất (COMPLETED)
 * 
 * Chức năng:
 * 1. Cập nhật season_team_statistics (điểm, số trận, bàn thắng, hiệu số)
 * 2. Cập nhật player_match_stats nếu chưa có
 * 3. Xử lý disciplinary (thẻ vàng/đỏ -> treo giò)
 * 4. Recalculate standings & rankings
 */

import { query } from "../db/sqlServer";
import { calculateStandings } from "./standingsAdminService";
import { recalculateDisciplinaryForSeason } from "./disciplinaryService";
import sql from 'mssql';

export interface MatchResultSummary {
  matchId: number;
  seasonId: number;
  homeSeasonTeamId: number;
  awaySeasonTeamId: number;
  homeScore: number;
  awayScore: number;
  homeTeamName: string;
  awayTeamName: string;
}

/**
 * Main function: Process match result after completion
 * Called when match status changes to COMPLETED
 */
export async function processMatchCompletion(matchId: number): Promise<{
  success: boolean;
  standingsUpdated: boolean;
  disciplinaryUpdated: boolean;
  errors: string[];
}> {
  console.log(`[processMatchCompletion] Starting for match ${matchId}`);
  
  const errors: string[] = [];
  let standingsUpdated = false;
  let disciplinaryUpdated = false;

  try {
    // 1. Get match details
    const match = await getMatchResult(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    if (match.homeScore === null || match.awayScore === null) {
      throw new Error(`Match ${matchId} does not have complete scores`);
    }

    console.log(`[processMatchCompletion] Match: ${match.homeTeamName} ${match.homeScore} - ${match.awayScore} ${match.awayTeamName}`);

    // 2. Update standings for the season
    try {
      await calculateStandings(match.seasonId);
      standingsUpdated = true;
      console.log(`[processMatchCompletion] Standings updated for season ${match.seasonId}`);
    } catch (err: any) {
      errors.push(`Standings update failed: ${err.message}`);
      console.error(`[processMatchCompletion] Standings error:`, err);
    }

    // 3. Process disciplinary (cards -> suspensions)
    try {
      const disciplinaryResult = await recalculateDisciplinaryForSeason(match.seasonId);
      disciplinaryUpdated = true;
      console.log(`[processMatchCompletion] Disciplinary updated: ${disciplinaryResult.created} suspensions created`);
    } catch (err: any) {
      errors.push(`Disciplinary update failed: ${err.message}`);
      console.error(`[processMatchCompletion] Disciplinary error:`, err);
    }

    // 4. Update goal_difference column (computed from goals_for - goals_against)
    try {
      await query(
        `
        UPDATE season_team_statistics
        SET goal_difference = goals_for - goals_against
        WHERE season_id = @seasonId
        `,
        { seasonId: match.seasonId }
      );
    } catch (err: any) {
      console.warn(`[processMatchCompletion] Goal difference update warning:`, err);
    }

    console.log(`[processMatchCompletion] Completed for match ${matchId}. Errors: ${errors.length}`);

    return {
      success: errors.length === 0,
      standingsUpdated,
      disciplinaryUpdated,
      errors
    };

  } catch (err: any) {
    console.error(`[processMatchCompletion] Fatal error:`, err);
    return {
      success: false,
      standingsUpdated,
      disciplinaryUpdated,
      errors: [err.message || 'Unknown error']
    };
  }
}

/**
 * Get match result summary
 */
async function getMatchResult(matchId: number): Promise<MatchResultSummary | null> {
  const result = await query<{
    match_id: number;
    season_id: number;
    home_season_team_id: number;
    away_season_team_id: number;
    home_score: number;
    away_score: number;
    home_team_name: string;
    away_team_name: string;
  }>(
    `
    SELECT 
      m.match_id,
      m.season_id,
      m.home_season_team_id,
      m.away_season_team_id,
      m.home_score,
      m.away_score,
      ht.name as home_team_name,
      at.name as away_team_name
    FROM matches m
    INNER JOIN season_team_participants stp_home ON m.home_season_team_id = stp_home.season_team_id
    INNER JOIN teams ht ON stp_home.team_id = ht.team_id
    INNER JOIN season_team_participants stp_away ON m.away_season_team_id = stp_away.season_team_id
    INNER JOIN teams at ON stp_away.team_id = at.team_id
    WHERE m.match_id = @matchId
    `,
    { matchId }
  );

  if (result.recordset.length === 0) {
    return null;
  }

  const row = result.recordset[0];
  return {
    matchId: row.match_id,
    seasonId: row.season_id,
    homeSeasonTeamId: row.home_season_team_id,
    awaySeasonTeamId: row.away_season_team_id,
    homeScore: row.home_score,
    awayScore: row.away_score,
    homeTeamName: row.home_team_name,
    awayTeamName: row.away_team_name
  };
}

/**
 * Rollback match result (if match status reverted from COMPLETED)
 * Recalculates everything from scratch
 */
export async function rollbackMatchResult(matchId: number): Promise<{
  success: boolean;
  errors: string[];
}> {
  console.log(`[rollbackMatchResult] Rolling back match ${matchId}`);
  
  try {
    const match = await getMatchResult(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    // Simply recalculate standings (which will exclude non-completed matches)
    await calculateStandings(match.seasonId);
    await recalculateDisciplinaryForSeason(match.seasonId);

    console.log(`[rollbackMatchResult] Rollback completed for match ${matchId}`);
    return {
      success: true,
      errors: []
    };

  } catch (err: any) {
    console.error(`[rollbackMatchResult] Error:`, err);
    return {
      success: false,
      errors: [err.message || 'Unknown error']
    };
  }
}

/**
 * Batch process all completed matches in a season
 * Useful for initial data migration or repair
 */
export async function batchProcessSeasonMatches(seasonId: number): Promise<{
  processed: number;
  failed: number;
  errors: string[];
}> {
  console.log(`[batchProcessSeasonMatches] Processing season ${seasonId}`);
  
  const errors: string[] = [];
  let processed = 0;
  let failed = 0;

  try {
    // Get all completed matches
    const matchesResult = await query<{ match_id: number }>(
      `
      SELECT match_id
      FROM matches
      WHERE season_id = @seasonId
      AND status = 'completed'
      AND home_score IS NOT NULL
      AND away_score IS NOT NULL
      ORDER BY scheduled_kickoff ASC
      `,
      { seasonId }
    );

    console.log(`[batchProcessSeasonMatches] Found ${matchesResult.recordset.length} completed matches`);

    // Process each match
    for (const row of matchesResult.recordset) {
      try {
        await processMatchCompletion(row.match_id);
        processed++;
      } catch (err: any) {
        failed++;
        errors.push(`Match ${row.match_id}: ${err.message}`);
      }
    }

    // Final recalculation
    await calculateStandings(seasonId);
    await recalculateDisciplinaryForSeason(seasonId);

    console.log(`[batchProcessSeasonMatches] Completed: ${processed} processed, ${failed} failed`);

    return { processed, failed, errors };

  } catch (err: any) {
    console.error(`[batchProcessSeasonMatches] Fatal error:`, err);
    throw err;
  }
}

/**
 * Get standings summary for a season
 * Returns formatted data for frontend display
 */
export async function getStandingsSummary(seasonId: number) {
  const result = await query<{
    season_team_id: number;
    team_id: number;
    team_name: string;
    short_name: string;
    matches_played: number;
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
    points: number;
    current_rank: number;
  }>(
    `
    SELECT 
      sts.season_team_id,
      t.team_id,
      t.name as team_name,
      t.short_name,
      sts.matches_played,
      sts.wins,
      sts.draws,
      sts.losses,
      sts.goals_for,
      sts.goals_against,
      sts.goal_difference,
      sts.points,
      sts.current_rank
    FROM season_team_statistics sts
    INNER JOIN season_team_participants stp ON sts.season_team_id = stp.season_team_id
    INNER JOIN teams t ON stp.team_id = t.team_id
    WHERE sts.season_id = @seasonId
    ORDER BY sts.points DESC, sts.goal_difference DESC, sts.goals_for DESC
    `,
    { seasonId }
  );

  return result.recordset.map((row, index) => ({
    rank: index + 1,
    seasonTeamId: row.season_team_id,
    teamId: row.team_id,
    teamName: row.team_name,
    shortName: row.short_name,
    played: row.matches_played,
    won: row.wins,
    drawn: row.draws,
    lost: row.losses,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
    goalDifference: row.goal_difference,
    points: row.points
  }));
}

/**
 * Check if a player should be suspended for next match
 * Returns true if player has 2+ yellow cards or 1+ red card
 */
export async function checkPlayerSuspensionStatus(
  seasonPlayerId: number
): Promise<{
  suspended: boolean;
  reason?: string;
  yellowCards: number;
  redCards: number;
}> {
  const result = await query<{
    yellow_cards: number;
    red_cards: number;
  }>(
    `
    SELECT 
      SUM(CASE WHEN me.card_type = 'YELLOW' THEN 1 ELSE 0 END) as yellow_cards,
      SUM(CASE WHEN me.card_type IN ('RED', 'SECOND_YELLOW') THEN 1 ELSE 0 END) as red_cards
    FROM match_events me
    INNER JOIN matches m ON me.match_id = m.match_id
    WHERE me.season_player_id = @seasonPlayerId
      AND me.event_type = 'CARD'
      AND m.status = 'completed'
    GROUP BY me.season_player_id
    `,
    { seasonPlayerId }
  );

  if (result.recordset.length === 0) {
    return {
      suspended: false,
      yellowCards: 0,
      redCards: 0
    };
  }

  const row = result.recordset[0];
  const yellowCards = row.yellow_cards || 0;
  const redCards = row.red_cards || 0;

  let suspended = false;
  let reason: string | undefined;

  if (redCards >= 1) {
    suspended = true;
    reason = 'Thẻ đỏ';
  } else if (yellowCards >= 2) {
    suspended = true;
    reason = '2 thẻ vàng tích lũy';
  }

  return {
    suspended,
    reason,
    yellowCards,
    redCards
  };
}
