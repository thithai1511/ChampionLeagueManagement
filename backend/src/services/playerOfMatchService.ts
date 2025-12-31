import { query } from "../db/sqlServer";

export interface PlayerOfMatch {
  pom_id: number;
  match_id: number;
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
  selected_by_method: "referee" | "team_captain" | "fan_vote" | "statistics";
  votes_count: number | null;
  rating: number | null;
  selected_at: string;
  created_at: string;
}

const basePomSelect = `
  SELECT
    pom.pom_id,
    pom.match_id,
    pom.player_id,
    p.full_name AS player_name,
    pom.team_id,
    t.name AS team_name,
    pom.selected_by_method,
    pom.votes_count,
    pom.rating,
    CONVERT(VARCHAR(23), pom.selected_at, 126) AS selected_at,
    CONVERT(VARCHAR(23), pom.created_at, 126) AS created_at
  FROM player_of_match pom
  INNER JOIN players p ON pom.player_id = p.player_id
  INNER JOIN teams t ON pom.team_id = t.team_id
`;

/**
 * Select player of the match
 */
export async function selectPlayerOfMatch(
  matchId: number,
  playerId: number,
  teamId: number,
  method: "referee" | "team_captain" | "fan_vote" | "statistics",
  votesCount?: number,
  rating?: number
): Promise<PlayerOfMatch> {
  const result = await query<PlayerOfMatch>(
    `
    INSERT INTO player_of_match (match_id, player_id, team_id, selected_by_method, votes_count, rating, selected_at, created_at)
    OUTPUT INSERTED.*
    VALUES (@matchId, @playerId, @teamId, @method, @votesCount, @rating, GETUTCDATE(), GETUTCDATE())
  `,
    {
      matchId,
      playerId,
      teamId,
      method,
      votesCount: votesCount || null,
      rating: rating || null,
    }
  );

  return result.recordset[0];
}

/**
 * Get player of the match for a specific match
 */
export async function getPlayerOfMatch(matchId: number): Promise<PlayerOfMatch | null> {
  const result = await query<PlayerOfMatch>(
    `${basePomSelect} WHERE pom.match_id = @matchId`,
    { matchId }
  );
  return result.recordset[0] || null;
}

/**
 * Get player of the match awards for a season
 */
export async function getSeasonPlayerOfMatch(seasonId: number): Promise<PlayerOfMatch[]> {
  const result = await query<PlayerOfMatch>(
    `
    ${basePomSelect}
    WHERE pom.match_id IN (
      SELECT match_id FROM matches WHERE season_id = @seasonId
    )
    ORDER BY pom.selected_at DESC
  `,
    { seasonId }
  );
  return result.recordset;
}

/**
 * Get player of the match awards for a specific player
 */
export async function getPlayerPomAwards(playerId: number): Promise<PlayerOfMatch[]> {
  const result = await query<PlayerOfMatch>(
    `${basePomSelect} WHERE pom.player_id = @playerId ORDER BY pom.selected_at DESC`,
    { playerId }
  );
  return result.recordset;
}

/**
 * Get player of the match awards for a specific team
 */
export async function getTeamPomAwards(teamId: number): Promise<PlayerOfMatch[]> {
  const result = await query<PlayerOfMatch>(
    `${basePomSelect} WHERE pom.team_id = @teamId ORDER BY pom.selected_at DESC`,
    { teamId }
  );
  return result.recordset;
}

/**
 * Get top players by POM awards in a season
 */
export async function getTopPlayersInSeason(
  seasonId: number,
  limit: number = 10
): Promise<
  Array<{
    player_id: number;
    player_name: string;
    team_name: string;
    pom_count: number;
  }>
> {
  const result = await query(
    `
    SELECT TOP (@limit)
      p.player_id,
      p.full_name AS player_name,
      t.name AS team_name,
      COUNT(*) AS pom_count
    FROM player_of_match pom
    INNER JOIN players p ON pom.player_id = p.player_id
    INNER JOIN teams t ON pom.team_id = t.team_id
    INNER JOIN matches m ON pom.match_id = m.match_id
    WHERE m.season_id = @seasonId
    GROUP BY p.player_id, p.full_name, t.name
    ORDER BY pom_count DESC
  `,
    { seasonId, limit }
  );

  return result.recordset;
}

/**
 * Check if a player already has POM for a match
 */
export async function hasPlayerPomForMatch(
  matchId: number,
  playerId: number
): Promise<boolean> {
  const result = await query<{ count: number }>(
    `
    SELECT COUNT(*) as count
    FROM player_of_match
    WHERE match_id = @matchId AND player_id = @playerId
  `,
    { matchId, playerId }
  );

  return result.recordset[0]?.count > 0;
}

/**
 * Update POM selection (change method, votes, rating)
 */
export async function updatePlayerOfMatch(
  pomId: number,
  updates: {
    method?: "referee" | "team_captain" | "fan_vote" | "statistics";
    votesCount?: number;
    rating?: number;
  }
): Promise<PlayerOfMatch | null> {
  const fields: string[] = [];
  const params: Record<string, unknown> = { pomId };

  if (updates.method !== undefined) {
    fields.push("selected_by_method = @method");
    params.method = updates.method;
  }
  if (updates.votesCount !== undefined) {
    fields.push("votes_count = @votesCount");
    params.votesCount = updates.votesCount;
  }
  if (updates.rating !== undefined) {
    fields.push("rating = @rating");
    params.rating = updates.rating;
  }

  if (fields.length === 0) {
    return getPlayerOfMatchById(pomId);
  }

  const result = await query<PlayerOfMatch>(
    `
    UPDATE player_of_match
    SET ${fields.join(", ")}
    OUTPUT INSERTED.*
    WHERE pom_id = @pomId
  `,
    params
  );

  return result.recordset[0] || null;
}

/**
 * Get POM by ID
 */
export async function getPlayerOfMatchById(pomId: number): Promise<PlayerOfMatch | null> {
  const result = await query<PlayerOfMatch>(
    `${basePomSelect} WHERE pom.pom_id = @pomId`,
    { pomId }
  );
  return result.recordset[0] || null;
}

/**
 * Delete POM selection
 */
export async function deletePlayerOfMatch(pomId: number): Promise<void> {
  await query(
    `DELETE FROM player_of_match WHERE pom_id = @pomId`,
    { pomId }
  );
}

/**
 * Get fan voting results for a match (if using fan_vote method)
 */
export async function getFanVotingResults(matchId: number): Promise<
  Array<{
    player_id: number;
    player_name: string;
    team_name: string;
    vote_count: number;
  }>
> {
  const result = await query(
    `
    SELECT
      p.player_id,
      p.full_name AS player_name,
      t.name AS team_name,
      COUNT(*) AS vote_count
    FROM player_of_match_votes pmv
    INNER JOIN players p ON pmv.player_id = p.player_id
    INNER JOIN teams t ON p.current_team_id = t.team_id
    WHERE pmv.match_id = @matchId
    GROUP BY p.player_id, p.full_name, t.name
    ORDER BY vote_count DESC
  `,
    { matchId }
  );

  return result.recordset;
}

/**
 * Get POM statistics for season
 */
export async function getSeasonPomStatistics(seasonId: number): Promise<{
  total_pom_selections: number;
  by_method: Array<{ method: string; count: number }>;
  average_rating: number;
}> {
  const result = await query<{
    total_pom_selections: number;
    average_rating: number;
  }>(
    `
    SELECT
      COUNT(*) AS total_pom_selections,
      AVG(CAST(pom.rating AS FLOAT)) AS average_rating
    FROM player_of_match pom
    INNER JOIN matches m ON pom.match_id = m.match_id
    WHERE m.season_id = @seasonId
  `,
    { seasonId }
  );

  const byMethodResult = await query<{ method: string; count: number }>(
    `
    SELECT
      selected_by_method as method,
      COUNT(*) AS count
    FROM player_of_match pom
    INNER JOIN matches m ON pom.match_id = m.match_id
    WHERE m.season_id = @seasonId
    GROUP BY selected_by_method
  `,
    { seasonId }
  );

  return {
    total_pom_selections: result.recordset[0]?.total_pom_selections || 0,
    by_method: byMethodResult.recordset || [],
    average_rating: result.recordset[0]?.average_rating || 0,
  };
}
