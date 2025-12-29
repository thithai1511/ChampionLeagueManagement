/**
 * Standings Service
 * 
 * Manages season standings in the internal `season_team_statistics` table.
 * NOTE: The FootballStandings table has been removed.
 * External API sync is disabled.
 */

import { query } from "../db/sqlServer";

export interface StandingRecord {
  id: number;
  seasonId: number;
  seasonName: string | null;
  position: number;
  teamId: number;
  teamName: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  updatedAt: string;
}

export interface StandingsFilters {
  seasonId?: number;
  teamId?: number;
}

export interface StandingsResponse {
  seasonId: number;
  seasonName: string;
  updated: string;
  table: StandingRecord[];
}

/**
 * Get standings from season_team_statistics table
 */
export const getStandings = async (filters: StandingsFilters = {}): Promise<StandingsResponse> => {
  const conditions: string[] = [];
  const parameters: Record<string, unknown> = {};

  if (filters.seasonId) {
    conditions.push("sts.season_id = @seasonId");
    parameters.seasonId = filters.seasonId;
  }

  if (filters.teamId) {
    conditions.push("sts.team_id = @teamId");
    parameters.teamId = filters.teamId;
  }

  // If no seasonId specified, get the latest season
  let targetSeasonId = filters.seasonId;
  if (!targetSeasonId) {
    const latestSeasonResult = await query<{ season_id: number }>(
      `SELECT TOP 1 season_id FROM seasons ORDER BY start_date DESC;`
    );
    targetSeasonId = latestSeasonResult.recordset[0]?.season_id;
    if (!targetSeasonId) {
      return {
        seasonId: 0,
        seasonName: "",
        updated: new Date().toISOString(),
        table: [],
      };
    }
    parameters.seasonId = targetSeasonId;
    if (!filters.seasonId) {
      conditions.push("sts.season_id = @seasonId");
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const dataResult = await query<StandingRecord>(
    `
      SELECT
        sts.stat_id AS id,
        sts.season_id AS seasonId,
        s.name AS seasonName,
        RANK() OVER (PARTITION BY sts.season_id ORDER BY sts.points DESC, (sts.goals_for - sts.goals_against) DESC) AS position,
        sts.team_id AS teamId,
        t.name AS teamName,
        sts.matches_played AS played,
        sts.wins AS won,
        sts.draws AS draw,
        sts.losses AS lost,
        sts.goals_for AS goalsFor,
        sts.goals_against AS goalsAgainst,
        (sts.goals_for - sts.goals_against) AS goalDifference,
        sts.points,
        CONVERT(VARCHAR(23), sts.updated_at, 126) AS updatedAt
      FROM season_team_statistics sts
      JOIN seasons s ON sts.season_id = s.season_id
      JOIN teams t ON sts.team_id = t.team_id
      ${whereClause}
      ORDER BY sts.points DESC, (sts.goals_for - sts.goals_against) DESC;
    `,
    parameters
  );

  // Get season info
  const seasonInfo = await query<{ name: string }>(
    `SELECT name FROM seasons WHERE season_id = @seasonId;`,
    { seasonId: targetSeasonId }
  );

  return {
    seasonId: targetSeasonId,
    seasonName: seasonInfo.recordset[0]?.name ?? "",
    updated: new Date().toISOString(),
    table: dataResult.recordset,
  };
};

/**
 * Get standing by ID
 */
export const getStandingById = async (id: number): Promise<StandingRecord | null> => {
  const result = await query<StandingRecord>(
    `
      SELECT
        sts.stat_id AS id,
        sts.season_id AS seasonId,
        s.name AS seasonName,
        0 AS position,
        sts.team_id AS teamId,
        t.name AS teamName,
        sts.matches_played AS played,
        sts.wins AS won,
        sts.draws AS draw,
        sts.losses AS lost,
        sts.goals_for AS goalsFor,
        sts.goals_against AS goalsAgainst,
        (sts.goals_for - sts.goals_against) AS goalDifference,
        sts.points,
        CONVERT(VARCHAR(23), sts.updated_at, 126) AS updatedAt
      FROM season_team_statistics sts
      JOIN seasons s ON sts.season_id = s.season_id
      JOIN teams t ON sts.team_id = t.team_id
      WHERE sts.stat_id = @id;
    `,
    { id }
  );

  return result.recordset[0] ?? null;
};

/**
 * Update team statistics after a match
 */
export const updateTeamStats = async (
  seasonId: number,
  teamId: number,
  matchResult: { goalsFor: number; goalsAgainst: number }
): Promise<void> => {
  const won = matchResult.goalsFor > matchResult.goalsAgainst ? 1 : 0;
  const draw = matchResult.goalsFor === matchResult.goalsAgainst ? 1 : 0;
  const lost = matchResult.goalsFor < matchResult.goalsAgainst ? 1 : 0;
  const points = won * 3 + draw;

  await query(
    `
      MERGE season_team_statistics AS target
      USING (VALUES (@seasonId, @teamId)) AS source(season_id, team_id)
      ON target.season_id = source.season_id AND target.team_id = source.team_id
      WHEN MATCHED THEN
        UPDATE SET
          matches_played = target.matches_played + 1,
          wins = target.wins + @won,
          draws = target.draws + @draw,
          losses = target.losses + @lost,
          goals_for = target.goals_for + @goalsFor,
          goals_against = target.goals_against + @goalsAgainst,
          points = target.points + @points,
          updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (season_id, team_id, matches_played, wins, draws, losses, goals_for, goals_against, points, created_at, updated_at)
        VALUES (@seasonId, @teamId, 1, @won, @draw, @lost, @goalsFor, @goalsAgainst, @points, SYSUTCDATETIME(), SYSUTCDATETIME());
    `,
    {
      seasonId,
      teamId,
      won,
      draw,
      lost,
      goalsFor: matchResult.goalsFor,
      goalsAgainst: matchResult.goalsAgainst,
      points,
    }
  );
};

/**
 * Recalculate standings from match results
 */
export const recalculateStandings = async (seasonId: number): Promise<number> => {
  // Reset all stats for the season
  await query(
    `
      UPDATE season_team_statistics
      SET matches_played = 0, wins = 0, draws = 0, losses = 0,
          goals_for = 0, goals_against = 0, points = 0, updated_at = SYSUTCDATETIME()
      WHERE season_id = @seasonId;
    `,
    { seasonId }
  );

  // Recalculate from completed matches
  const matches = await query<{
    home_season_team_id: number;
    away_season_team_id: number;
    home_team_id: number;
    away_team_id: number;
    score_home: number;
    score_away: number;
  }>(
    `
      SELECT 
        m.home_season_team_id,
        m.away_season_team_id,
        stp_home.team_id AS home_team_id,
        stp_away.team_id AS away_team_id,
        m.score_home,
        m.score_away
      FROM matches m
      JOIN season_team_participants stp_home ON m.home_season_team_id = stp_home.season_team_id
      JOIN season_team_participants stp_away ON m.away_season_team_id = stp_away.season_team_id
      WHERE m.season_id = @seasonId
        AND m.status = 'FINISHED'
        AND m.score_home IS NOT NULL
        AND m.score_away IS NOT NULL;
    `,
    { seasonId }
  );

  for (const match of matches.recordset) {
    await updateTeamStats(seasonId, match.home_team_id, {
      goalsFor: match.score_home,
      goalsAgainst: match.score_away,
    });
    await updateTeamStats(seasonId, match.away_team_id, {
      goalsFor: match.score_away,
      goalsAgainst: match.score_home,
    });
  }

  return matches.recordset.length;
};

/**
 * Delete standings for a season
 */
export const deleteStandingsBySeason = async (seasonId: number): Promise<number> => {
  const result = await query<{ rowsAffected: number }>(
    "DELETE FROM season_team_statistics WHERE season_id = @seasonId;",
    { seasonId }
  );
  return result.rowsAffected?.[0] ?? 0;
};

// Legacy export for backward compatibility
export interface CompetitionStandings {
  season: {
    year: number;
    label: string;
    startDate: string;
    endDate: string;
  };
  table: StandingRecord[];
}

/**
 * @deprecated External API sync is disabled. Use recalculateStandings instead.
 */
export const syncStandingsFromUpstream = async (_season?: string): Promise<{
  season: string | undefined;
  totalRows: number;
}> => {
  console.warn('[standingsService] syncStandingsFromUpstream is deprecated - Football* tables removed');
  return { season: undefined, totalRows: 0 };
};

/**
 * @deprecated Use getStandings with seasonId instead.
 */
export const deleteStanding = async (_id: number): Promise<boolean> => {
  console.warn('[standingsService] deleteStanding is deprecated');
  return false;
};

/**
 * @deprecated Use recalculateStandings with seasonId instead.
 */
export const updateStanding = async (
  _id: number,
  _input: Partial<StandingRecord>
): Promise<StandingRecord | null> => {
  console.warn('[standingsService] updateStanding is deprecated - use recalculateStandings');
  return null;
};
