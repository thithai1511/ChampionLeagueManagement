import { query } from "../db/sqlServer";

export interface PlayerCardStats {
  playerId: number;
  playerName: string;
  teamId: number;
  teamName: string;
  seasonId: number;
  yellowCards: number;
  redCards: number;
  totalCards: number;
  matchesPlayed: number;
  isSuspended: boolean;
  suspensionReason: string | null;
}

export interface PlayerGoalStats {
  playerId: number;
  playerName: string;
  teamId: number;
  teamName: string;
  seasonId: number;
  goals: number;
  assists: number;
  matchesPlayed: number;
  goalsPerMatch: number;
}

export interface ManOfTheMatchStats {
  playerId: number;
  playerName: string;
  teamId: number;
  teamName: string;
  seasonId: number;
  motmCount: number;
  matchesPlayed: number;
}

export interface SuspendedPlayer {
  playerId: number;
  playerName: string;
  teamId: number;
  teamName: string;
  seasonId: number;
  reason: 'two_yellows' | 'direct_red' | 'second_yellow_red';
  yellowCards: number;
  redCards: number;
  suspendedUntilMatchId: number | null;
  lastCardMatchId: number;
  lastCardDate: Date;
}

/**
 * Get card statistics aggregated by player for a season
 * Uses match_events table for card data
 */
export async function getCardStatsBySeason(seasonId: number): Promise<PlayerCardStats[]> {
  const result = await query<{
    player_id: number;
    player_name: string;
    team_id: number;
    team_name: string;
    season_id: number;
    yellow_cards: number;
    red_cards: number;
    matches_played: number;
  }>(
    `SELECT 
      p.player_id,
      p.full_name AS player_name,
      t.team_id,
      t.name AS team_name,
      spr.season_id,
      COALESCE(SUM(CASE WHEN me.card_type = 'YELLOW' THEN 1 ELSE 0 END), 0) AS yellow_cards,
      COALESCE(SUM(CASE WHEN me.card_type IN ('RED', 'SECOND_YELLOW') THEN 1 ELSE 0 END), 0) AS red_cards,
      COUNT(DISTINCT me.match_id) AS matches_played
     FROM season_player_registrations spr
     INNER JOIN players p ON spr.player_id = p.player_id
     INNER JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
     INNER JOIN teams t ON stp.team_id = t.team_id
     LEFT JOIN match_events me ON spr.season_player_id = me.season_player_id
     WHERE spr.season_id = @seasonId
       AND spr.registration_status = 'approved'
     GROUP BY p.player_id, p.full_name, t.team_id, t.name, spr.season_id
     HAVING COALESCE(SUM(CASE WHEN me.card_type = 'YELLOW' THEN 1 ELSE 0 END), 0) > 0 
        OR COALESCE(SUM(CASE WHEN me.card_type IN ('RED', 'SECOND_YELLOW') THEN 1 ELSE 0 END), 0) > 0
     ORDER BY (COALESCE(SUM(CASE WHEN me.card_type = 'YELLOW' THEN 1 ELSE 0 END), 0) + 
               COALESCE(SUM(CASE WHEN me.card_type IN ('RED', 'SECOND_YELLOW') THEN 1 ELSE 0 END), 0) * 2) DESC`,
    { seasonId }
  );

  return result.recordset.map(row => ({
    playerId: row.player_id,
    playerName: row.player_name,
    teamId: row.team_id,
    teamName: row.team_name,
    seasonId: row.season_id,
    yellowCards: row.yellow_cards,
    redCards: row.red_cards,
    totalCards: row.yellow_cards + row.red_cards,
    matchesPlayed: row.matches_played,
    isSuspended: row.yellow_cards >= 2 || row.red_cards >= 1,
    suspensionReason: row.red_cards >= 1
      ? 'Thẻ đỏ trực tiếp'
      : row.yellow_cards >= 2
        ? '2 thẻ vàng tích lũy'
        : null
  }));
}

/**
 * Get top scorers for a season
 * Uses match_events table for goal and assist data
 */
export async function getTopScorersBySeason(seasonId: number, limit: number = 20): Promise<PlayerGoalStats[]> {
  const result = await query<{
    player_id: number;
    player_name: string;
    team_id: number;
    team_name: string;
    season_id: number;
    goals: number;
    assists: number;
    matches_played: number;
  }>(
    `SELECT TOP (@limit)
      p.player_id,
      p.full_name AS player_name,
      t.team_id,
      t.name AS team_name,
      spr.season_id,
      COALESCE(SUM(CASE WHEN me.event_type = 'GOAL' THEN 1 ELSE 0 END), 0) AS goals,
      COALESCE(SUM(CASE WHEN me.event_type = 'ASSIST' THEN 1 ELSE 0 END), 0) AS assists,
      COUNT(DISTINCT me.match_id) AS matches_played
     FROM season_player_registrations spr
     INNER JOIN players p ON spr.player_id = p.player_id
     INNER JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
     INNER JOIN teams t ON stp.team_id = t.team_id
     LEFT JOIN match_events me ON spr.season_player_id = me.season_player_id
     WHERE spr.season_id = @seasonId
       AND spr.registration_status = 'approved'
     GROUP BY p.player_id, p.full_name, t.team_id, t.name, spr.season_id
     HAVING COALESCE(SUM(CASE WHEN me.event_type = 'GOAL' THEN 1 ELSE 0 END), 0) > 0
     ORDER BY SUM(CASE WHEN me.event_type = 'GOAL' THEN 1 ELSE 0 END) DESC, 
              SUM(CASE WHEN me.event_type = 'ASSIST' THEN 1 ELSE 0 END) DESC`,
    { seasonId, limit }
  );

  return result.recordset.map(row => ({
    playerId: row.player_id,
    playerName: row.player_name,
    teamId: row.team_id,
    teamName: row.team_name,
    seasonId: row.season_id,
    goals: row.goals,
    assists: row.assists,
    matchesPlayed: row.matches_played,
    goalsPerMatch: row.matches_played > 0 ? Math.round((row.goals / row.matches_played) * 100) / 100 : 0
  }));
}

/**
 * Get Man of the Match statistics for a season
 * Combines data from player_of_match table (primary) and player_match_stats (fallback)
 */
export async function getMotmStatsBySeason(seasonId: number): Promise<ManOfTheMatchStats[]> {
  // First try to get data from player_of_match table (the dedicated table for MOTM)
  const pomResult = await query<{
    player_id: number;
    player_name: string;
    team_id: number;
    team_name: string;
    motm_count: number;
    matches_played: number;
  }>(
    `SELECT 
      p.player_id,
      p.full_name AS player_name,
      t.team_id,
      t.name AS team_name,
      COUNT(DISTINCT pom.pom_id) AS motm_count,
      COUNT(DISTINCT ml.match_id) AS matches_played
     FROM players p
     INNER JOIN season_player_registrations spr ON p.player_id = spr.player_id
     INNER JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
     INNER JOIN teams t ON stp.team_id = t.team_id
     LEFT JOIN player_of_match pom ON p.player_id = pom.player_id 
       AND pom.match_id IN (SELECT match_id FROM matches WHERE season_id = @seasonId)
     LEFT JOIN match_lineups ml ON spr.season_player_id = ml.season_player_id
       AND ml.match_id IN (SELECT match_id FROM matches WHERE season_id = @seasonId)
     WHERE spr.season_id = @seasonId
       AND spr.registration_status = 'approved'
     GROUP BY p.player_id, p.full_name, t.team_id, t.name
     HAVING COUNT(DISTINCT pom.pom_id) > 0
     ORDER BY COUNT(DISTINCT pom.pom_id) DESC`,
    { seasonId }
  );

  // If we have data from player_of_match table, return it
  if (pomResult.recordset.length > 0) {
    return pomResult.recordset.map(row => ({
      playerId: row.player_id,
      playerName: row.player_name,
      teamId: row.team_id,
      teamName: row.team_name,
      seasonId: seasonId,
      motmCount: row.motm_count,
      matchesPlayed: row.matches_played
    }));
  }

  // Fallback: try player_match_stats table
  const pmsResult = await query<{
    player_id: number;
    player_name: string;
    team_id: number;
    team_name: string;
    season_id: number;
    motm_count: number;
    matches_played: number;
  }>(
    `SELECT 
      p.player_id,
      p.full_name AS player_name,
      t.team_id,
      t.name AS team_name,
      spr.season_id,
      COALESCE(SUM(CAST(pms.player_of_match AS INT)), 0) AS motm_count,
      COUNT(DISTINCT pms.match_id) AS matches_played
     FROM season_player_registrations spr
     INNER JOIN players p ON spr.player_id = p.player_id
     INNER JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
     INNER JOIN teams t ON stp.team_id = t.team_id
     LEFT JOIN player_match_stats pms ON spr.season_player_id = pms.season_player_id
     WHERE spr.season_id = @seasonId
       AND spr.registration_status = 'approved'
     GROUP BY p.player_id, p.full_name, t.team_id, t.name, spr.season_id
     HAVING COALESCE(SUM(CAST(pms.player_of_match AS INT)), 0) > 0
     ORDER BY SUM(CAST(pms.player_of_match AS INT)) DESC`,
    { seasonId }
  );

  return pmsResult.recordset.map(row => ({
    playerId: row.player_id,
    playerName: row.player_name,
    teamId: row.team_id,
    teamName: row.team_name,
    seasonId: row.season_id,
    motmCount: row.motm_count,
    matchesPlayed: row.matches_played
  }));
}

/**
 * Get list of suspended players for a season
 * Players are suspended if they have:
 * - 2 accumulated yellow cards (reset after serving suspension)
 * - 1 direct red card
 * - 2nd yellow in same match (automatic red)
 * Uses match_events table for card data
 */
export async function getSuspendedPlayers(seasonId: number): Promise<SuspendedPlayer[]> {
  const result = await query<{
    player_id: number;
    player_name: string;
    team_id: number;
    team_name: string;
    season_id: number;
    yellow_cards: number;
    red_cards: number;
    last_card_match_id: number;
    last_card_date: Date;
  }>(
    `WITH PlayerCardSummary AS (
      SELECT 
        p.player_id,
        p.full_name AS player_name,
        t.team_id,
        t.name AS team_name,
        spr.season_id,
        COALESCE(SUM(CASE WHEN me.card_type = 'YELLOW' THEN 1 ELSE 0 END), 0) AS yellow_cards,
        COALESCE(SUM(CASE WHEN me.card_type IN ('RED', 'SECOND_YELLOW') THEN 1 ELSE 0 END), 0) AS red_cards,
        MAX(me.match_id) AS last_card_match_id,
        MAX(m.scheduled_kickoff) AS last_card_date
      FROM season_player_registrations spr
      INNER JOIN players p ON spr.player_id = p.player_id
      INNER JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
      INNER JOIN teams t ON stp.team_id = t.team_id
      INNER JOIN match_events me ON spr.season_player_id = me.season_player_id AND me.event_type = 'CARD'
      INNER JOIN matches m ON me.match_id = m.match_id
      WHERE spr.season_id = @seasonId
        AND spr.registration_status = 'approved'
      GROUP BY p.player_id, p.full_name, t.team_id, t.name, spr.season_id
    )
    SELECT * FROM PlayerCardSummary
    WHERE yellow_cards >= 2 OR red_cards >= 1
    ORDER BY red_cards DESC, yellow_cards DESC`,
    { seasonId }
  );

  return result.recordset.map(row => {
    let reason: 'two_yellows' | 'direct_red' | 'second_yellow_red' = 'two_yellows';
    if (row.red_cards >= 1) {
      reason = 'direct_red';
    }

    return {
      playerId: row.player_id,
      playerName: row.player_name,
      teamId: row.team_id,
      teamName: row.team_name,
      seasonId: row.season_id,
      reason,
      yellowCards: row.yellow_cards,
      redCards: row.red_cards,
      suspendedUntilMatchId: null, // Would be computed based on next scheduled match
      lastCardMatchId: row.last_card_match_id,
      lastCardDate: row.last_card_date
    };
  });
}

/**
 * Get clean sheets statistics for goalkeepers in a season
 * Clean sheet = match where team conceded 0 goals and goalkeeper played
 */
export async function getCleanSheetsBySeason(seasonId: number, limit: number = 20): Promise<Array<{
  playerId: number;
  playerName: string;
  teamId: number;
  teamName: string;
  seasonId: number;
  cleanSheets: number;
  matchesPlayed: number;
}>> {
  const result = await query<{
    player_id: number;
    player_name: string;
    team_id: number;
    team_name: string;
    season_id: number;
    clean_sheets: number;
    matches_played: number;
  }>(
    `SELECT TOP (@limit)
      p.player_id,
      p.full_name AS player_name,
      t.team_id,
      t.name AS team_name,
      spr.season_id,
      COUNT(DISTINCT CASE 
        WHEN (m.home_team_id = t.team_id AND ISNULL(m.away_score, 0) = 0) 
          OR (m.away_team_id = t.team_id AND ISNULL(m.home_score, 0) = 0)
        THEN m.match_id 
        ELSE NULL 
      END) AS clean_sheets,
      COUNT(DISTINCT pms.match_id) AS matches_played
     FROM season_player_registrations spr
     INNER JOIN players p ON spr.player_id = p.player_id
     INNER JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
     INNER JOIN teams t ON stp.team_id = t.team_id
     INNER JOIN player_match_stats pms ON spr.season_player_id = pms.season_player_id
     INNER JOIN matches m ON pms.match_id = m.match_id
     WHERE spr.season_id = @seasonId
       AND spr.registration_status = 'approved'
       AND (p.preferred_position LIKE '%Goalkeeper%' OR p.preferred_position LIKE '%GK%')
       AND m.status = 'COMPLETED'
       AND pms.minutes_played > 0
     GROUP BY p.player_id, p.full_name, t.team_id, t.name, spr.season_id
     HAVING COUNT(DISTINCT CASE 
       WHEN (m.home_team_id = t.team_id AND ISNULL(m.away_score, 0) = 0) 
         OR (m.away_team_id = t.team_id AND ISNULL(m.home_score, 0) = 0)
       THEN m.match_id 
       ELSE NULL 
     END) > 0
     ORDER BY clean_sheets DESC, matches_played DESC`,
    { seasonId, limit }
  );

  return result.recordset.map(row => ({
    playerId: row.player_id,
    playerName: row.player_name,
    teamId: row.team_id,
    teamName: row.team_name,
    seasonId: row.season_id,
    cleanSheets: row.clean_sheets,
    matchesPlayed: row.matches_played
  }));
}

/**
 * Get minutes played statistics for players in a season
 */
export async function getMinutesPlayedBySeason(seasonId: number, limit: number = 50): Promise<Array<{
  playerId: number;
  playerName: string;
  teamId: number;
  teamName: string;
  seasonId: number;
  totalMinutes: number;
  matchesPlayed: number;
}>> {
  const result = await query<{
    player_id: number;
    player_name: string;
    team_id: number;
    team_name: string;
    season_id: number;
    total_minutes: number;
    matches_played: number;
  }>(
    `SELECT TOP (@limit)
      p.player_id,
      p.full_name AS player_name,
      t.team_id,
      t.name AS team_name,
      spr.season_id,
      SUM(ISNULL(pms.minutes_played, 0)) AS total_minutes,
      COUNT(DISTINCT pms.match_id) AS matches_played
     FROM season_player_registrations spr
     INNER JOIN players p ON spr.player_id = p.player_id
     INNER JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
     INNER JOIN teams t ON stp.team_id = t.team_id
     INNER JOIN player_match_stats pms ON spr.season_player_id = pms.season_player_id
     INNER JOIN matches m ON pms.match_id = m.match_id
     WHERE spr.season_id = @seasonId
       AND spr.registration_status = 'approved'
       AND m.status = 'COMPLETED'
       AND pms.minutes_played > 0
     GROUP BY p.player_id, p.full_name, t.team_id, t.name, spr.season_id
     HAVING SUM(ISNULL(pms.minutes_played, 0)) > 0
     ORDER BY total_minutes DESC, matches_played DESC`,
    { seasonId, limit }
  );

  return result.recordset.map(row => ({
    playerId: row.player_id,
    playerName: row.player_name,
    teamId: row.team_id,
    teamName: row.team_name,
    seasonId: row.season_id,
    totalMinutes: row.total_minutes,
    matchesPlayed: row.matches_played
  }));
}

/**
 * Get comprehensive stats overview for admin dashboard
 */
export async function getSeasonStatsOverview(seasonId: number) {
  const [topScorers, cardStats, motmStats, suspendedPlayers] = await Promise.all([
    getTopScorersBySeason(seasonId, 10),
    getCardStatsBySeason(seasonId),
    getMotmStatsBySeason(seasonId),
    getSuspendedPlayers(seasonId)
  ]);

  // Calculate totals
  const totalYellowCards = cardStats.reduce((sum, p) => sum + p.yellowCards, 0);
  const totalRedCards = cardStats.reduce((sum, p) => sum + p.redCards, 0);
  const totalGoals = topScorers.reduce((sum, p) => sum + p.goals, 0);
  const totalAssists = topScorers.reduce((sum, p) => sum + p.assists, 0);

  return {
    topScorers,
    cardStats: cardStats.slice(0, 20), // Top 20 players with most cards
    motmStats: motmStats.slice(0, 10), // Top 10 man of the match
    suspendedPlayers,
    summary: {
      totalYellowCards,
      totalRedCards,
      totalGoals,
      totalAssists,
      suspendedCount: suspendedPlayers.length
    }
  };
}

