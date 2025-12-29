/**
 * awardService.ts
 * Service for handling season awards: Top Scorers, MVP, etc.
 */

import sql from 'mssql';
import { getPool } from '../db/sqlServer';

export interface TopScorer {
  rank: number;
  seasonPlayerId: number;
  playerId: number;
  playerName: string;
  shirtNumber: number | null;
  teamId: number;
  teamName: string;
  nationality: string | null;
  goals: number;
  matchesPlayed: number;
}

export interface TopMVP {
  rank: number;
  seasonPlayerId: number;
  playerId: number;
  playerName: string;
  shirtNumber: number | null;
  teamId: number;
  teamName: string;
  nationality: string | null;
  mvpCount: number;
  matchesPlayed: number;
}

/**
 * Get top scorers for a season
 * Based on GOAL events in match_events (excluding OWN_GOAL)
 */
export async function getTopScorers(seasonId: number, limit: number = 10): Promise<TopScorer[]> {
  const pool = await getPool();
  
  const result = await pool.request()
    .input('seasonId', sql.Int, seasonId)
    .input('limit', sql.Int, limit)
    .query(`
      WITH GoalCounts AS (
        SELECT 
          me.season_player_id,
          COUNT(*) as goals
        FROM match_events me
        INNER JOIN matches m ON me.match_id = m.match_id
        WHERE me.season_id = @seasonId
          AND me.event_type = 'GOAL'
          AND m.status = 'COMPLETED'
        GROUP BY me.season_player_id
      ),
      MatchesPlayed AS (
        SELECT 
          pms.season_player_id,
          COUNT(DISTINCT pms.match_id) as matches_played
        FROM player_match_stats pms
        INNER JOIN matches m ON pms.match_id = m.match_id
        WHERE pms.season_id = @seasonId
          AND pms.minutes_played > 0
          AND m.status = 'COMPLETED'
        GROUP BY pms.season_player_id
      )
      SELECT TOP (@limit)
        gc.season_player_id,
        spr.player_id,
        p.full_name as player_name,
        spr.shirt_number,
        stp.internal_team_id as team_id,
        it.name as team_name,
        p.nationality,
        gc.goals,
        ISNULL(mp.matches_played, 0) as matches_played
      FROM GoalCounts gc
      INNER JOIN season_player_registrations spr ON gc.season_player_id = spr.season_player_id
      INNER JOIN players p ON spr.player_id = p.player_id
      INNER JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
      INNER JOIN internal_teams it ON stp.internal_team_id = it.internal_team_id
      LEFT JOIN MatchesPlayed mp ON gc.season_player_id = mp.season_player_id
      ORDER BY gc.goals DESC, mp.matches_played ASC, p.full_name ASC
    `);

  return result.recordset.map((row, index) => ({
    rank: index + 1,
    seasonPlayerId: row.season_player_id,
    playerId: row.player_id,
    playerName: row.player_name,
    shirtNumber: row.shirt_number,
    teamId: row.team_id,
    teamName: row.team_name,
    nationality: row.nationality,
    goals: row.goals,
    matchesPlayed: row.matches_played
  }));
}

/**
 * Get top MVPs (Player of the Match) for a season
 * Uses player_of_match table (primary) with fallback to player_match_stats
 */
export async function getTopMVPs(seasonId: number, limit: number = 10): Promise<TopMVP[]> {
  const pool = await getPool();
  
  // First try player_of_match table (the dedicated table for MOTM selections)
  const pomResult = await pool.request()
    .input('seasonId', sql.Int, seasonId)
    .input('limit', sql.Int, limit)
    .query(`
      WITH MVPCounts AS (
        SELECT 
          spr.season_player_id,
          COUNT(DISTINCT pom.pom_id) as mvp_count
        FROM player_of_match pom
        INNER JOIN matches m ON pom.match_id = m.match_id
        INNER JOIN season_player_registrations spr ON pom.player_id = spr.player_id AND spr.season_id = @seasonId
        WHERE m.season_id = @seasonId
          AND m.status = 'COMPLETED'
        GROUP BY spr.season_player_id
      ),
      MatchesPlayed AS (
        SELECT 
          ml.season_player_id,
          COUNT(DISTINCT ml.match_id) as matches_played
        FROM match_lineups ml
        INNER JOIN matches m ON ml.match_id = m.match_id
        WHERE m.season_id = @seasonId
          AND m.status = 'COMPLETED'
        GROUP BY ml.season_player_id
      )
      SELECT TOP (@limit)
        mvc.season_player_id,
        spr.player_id,
        p.full_name as player_name,
        spr.shirt_number,
        stp.internal_team_id as team_id,
        it.name as team_name,
        p.nationality,
        mvc.mvp_count,
        ISNULL(mp.matches_played, 0) as matches_played
      FROM MVPCounts mvc
      INNER JOIN season_player_registrations spr ON mvc.season_player_id = spr.season_player_id
      INNER JOIN players p ON spr.player_id = p.player_id
      INNER JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
      INNER JOIN internal_teams it ON stp.internal_team_id = it.internal_team_id
      LEFT JOIN MatchesPlayed mp ON mvc.season_player_id = mp.season_player_id
      ORDER BY mvc.mvp_count DESC, mp.matches_played ASC, p.full_name ASC
    `);

  // If we have data from player_of_match table, return it
  if (pomResult.recordset.length > 0) {
    return pomResult.recordset.map((row, index) => ({
      rank: index + 1,
      seasonPlayerId: row.season_player_id,
      playerId: row.player_id,
      playerName: row.player_name,
      shirtNumber: row.shirt_number,
      teamId: row.team_id,
      teamName: row.team_name,
      nationality: row.nationality,
      mvpCount: row.mvp_count,
      matchesPlayed: row.matches_played
    }));
  }

  // Fallback: try player_match_stats table
  const pmsResult = await pool.request()
    .input('seasonId', sql.Int, seasonId)
    .input('limit', sql.Int, limit)
    .query(`
      WITH MVPCounts AS (
        SELECT 
          pms.season_player_id,
          COUNT(*) as mvp_count
        FROM player_match_stats pms
        INNER JOIN matches m ON pms.match_id = m.match_id
        WHERE pms.season_id = @seasonId
          AND pms.player_of_match = 1
          AND m.status = 'COMPLETED'
        GROUP BY pms.season_player_id
      ),
      MatchesPlayed AS (
        SELECT 
          pms.season_player_id,
          COUNT(DISTINCT pms.match_id) as matches_played
        FROM player_match_stats pms
        INNER JOIN matches m ON pms.match_id = m.match_id
        WHERE pms.season_id = @seasonId
          AND pms.minutes_played > 0
          AND m.status = 'COMPLETED'
        GROUP BY pms.season_player_id
      )
      SELECT TOP (@limit)
        mvc.season_player_id,
        spr.player_id,
        p.full_name as player_name,
        spr.shirt_number,
        stp.internal_team_id as team_id,
        it.name as team_name,
        p.nationality,
        mvc.mvp_count,
        ISNULL(mp.matches_played, 0) as matches_played
      FROM MVPCounts mvc
      INNER JOIN season_player_registrations spr ON mvc.season_player_id = spr.season_player_id
      INNER JOIN players p ON spr.player_id = p.player_id
      INNER JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
      INNER JOIN internal_teams it ON stp.internal_team_id = it.internal_team_id
      LEFT JOIN MatchesPlayed mp ON mvc.season_player_id = mp.season_player_id
      ORDER BY mvc.mvp_count DESC, mp.matches_played ASC, p.full_name ASC
    `);

  return pmsResult.recordset.map((row, index) => ({
    rank: index + 1,
    seasonPlayerId: row.season_player_id,
    playerId: row.player_id,
    playerName: row.player_name,
    shirtNumber: row.shirt_number,
    teamId: row.team_id,
    teamName: row.team_name,
    nationality: row.nationality,
    mvpCount: row.mvp_count,
    matchesPlayed: row.matches_played
  }));
}

/**
 * Get season awards summary (champion scorer, MVP, etc.)
 */
export async function getSeasonAwardsSummary(seasonId: number) {
  const [topScorers, topMVPs] = await Promise.all([
    getTopScorers(seasonId, 1),
    getTopMVPs(seasonId, 1)
  ]);

  return {
    topScorer: topScorers[0] || null,
    topMVP: topMVPs[0] || null
  };
}
