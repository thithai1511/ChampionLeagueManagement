import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { query } from '../db/sqlServer';

/**
 * Get current player's profile
 */
export async function getPlayerProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Get player information from database
    // First, find player_id from season_player_registrations or players table
    const playerIdResult = await query<{ player_id: number }>(
      `
        SELECT TOP 1 p.player_id
        FROM players p
        INNER JOIN season_player_registrations spr ON p.player_id = spr.player_id
        WHERE spr.created_by = @userId
        ORDER BY spr.registered_at DESC
      `,
      { userId }
    );

    if (!playerIdResult.recordset || playerIdResult.recordset.length === 0) {
      res.status(404).json({ message: 'Player profile not found' });
      return;
    }

    const playerId = playerIdResult.recordset[0].player_id;

    const playerQuery = `
      SELECT 
        p.player_id,
        p.full_name,
        p.preferred_position as position,
        p.shirt_number as jersey_number,
        p.nationality,
        CONVERT(VARCHAR(10), p.date_of_birth, 23) as date_of_birth,
        p.place_of_birth,
        p.height_cm as height,
        p.weight_kg as weight,
        p.avatar_url,
        t.name as team_name,
        t.logo_url as team_logo,
        ua.email,
        ua.phone
      FROM players p
      LEFT JOIN teams t ON p.current_team_id = t.team_id
      LEFT JOIN user_accounts ua ON p.created_by = ua.user_id
      WHERE p.player_id = @playerId
    `;

    const result = await query(playerQuery, { playerId });
    
    if (!result.recordset || result.recordset.length === 0) {
      res.status(404).json({ message: 'Player profile not found' });
      return;
    }

    const player = result.recordset[0];

    res.json({
      data: player,
    });
  } catch (error) {
    console.error('Error fetching player profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update current player's profile (limited fields)
 */
export async function updatePlayerProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    const { phoneNumber, email } = req.body;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Players can only update contact information
    const updateQuery = `
      UPDATE user_accounts
      SET 
        phone = COALESCE(@phoneNumber, phone),
        email = COALESCE(@email, email),
        updated_at = SYSDATETIME()
      WHERE user_id = @userId
    `;

    await query(updateQuery, { userId, phoneNumber, email });

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating player profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get current player's statistics
 */
export async function getPlayerStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;
    const season = req.query.season as string || '2025';

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Get player ID from user ID via season_player_registrations
    const playerResult = await query<{ player_id: number }>(
      `
        SELECT TOP 1 p.player_id
        FROM players p
        INNER JOIN season_player_registrations spr ON p.player_id = spr.player_id
        WHERE spr.created_by = @userId
        ORDER BY spr.registered_at DESC
      `,
      { userId }
    );

    if (!playerResult.recordset || playerResult.recordset.length === 0) {
      res.status(404).json({ message: 'Player not found' });
      return;
    }

    const playerId = playerResult.recordset[0].player_id;

    // Get season_id from season parameter
    const seasonIdResult = await query<{ season_id: number }>(
      `SELECT season_id FROM seasons WHERE code = @season OR name LIKE @seasonPattern`,
      { season, seasonPattern: `%${season}%` }
    );

    if (!seasonIdResult.recordset || seasonIdResult.recordset.length === 0) {
      res.status(404).json({ message: 'Season not found' });
      return;
    }

    const seasonId = seasonIdResult.recordset[0].season_id;

    // Get season_player_id
    const seasonPlayerResult = await query<{ season_player_id: number }>(
      `SELECT season_player_id FROM season_player_registrations WHERE player_id = @playerId AND season_id = @seasonId`,
      { playerId, seasonId }
    );

    if (!seasonPlayerResult.recordset || seasonPlayerResult.recordset.length === 0) {
      res.status(404).json({ message: 'Player not registered in this season' });
      return;
    }

    const seasonPlayerId = seasonPlayerResult.recordset[0].season_player_id;

    // Get overall statistics from player_match_stats
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT pms.match_id) as matches_played,
        COALESCE(SUM(pms.goals), 0) as goals,
        COALESCE(SUM(pms.assists), 0) as assists,
        COALESCE(SUM(pms.minutes_played), 0) as minutes_played,
        COALESCE(SUM(pms.yellow_cards), 0) as yellow_cards,
        COALESCE(SUM(pms.red_cards), 0) as red_cards
      FROM player_match_stats pms
      INNER JOIN matches m ON pms.match_id = m.match_id
      WHERE pms.season_player_id = @seasonPlayerId
        AND m.season_id = @seasonId
    `;

    const statsResult = await query(statsQuery, { seasonPlayerId, seasonId });
    const stats = statsResult.recordset[0];

    // Get monthly goals
    const monthlyGoalsQuery = `
      SELECT 
        MONTH(m.scheduled_kickoff) as month,
        COUNT(*) as goals
      FROM match_events me
      INNER JOIN matches m ON me.match_id = m.match_id
      WHERE me.season_player_id = @seasonPlayerId
        AND me.event_type = 'goal'
        AND m.season_id = @seasonId
      GROUP BY MONTH(m.scheduled_kickoff)
      ORDER BY MONTH(m.scheduled_kickoff)
    `;

    const monthlyResult = await query(monthlyGoalsQuery, { seasonPlayerId, seasonId });

    res.json({
      data: {
        overview: {
          matchesPlayed: stats.matches_played || 0,
          goals: stats.goals || 0,
          assists: stats.assists || 0,
          minutesPlayed: stats.minutes_played || 0,
          yellowCards: stats.yellow_cards || 0,
          redCards: stats.red_cards || 0,
        },
        monthlyGoals: monthlyResult.recordset || [],
      },
    });
  } catch (error) {
    console.error('Error fetching player statistics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get current player's matches (past and upcoming)
 */
export async function getPlayerMatches(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Get player and team information
    const playerResult = await query<{ player_id: number; current_team_id: number | null }>(
      `
        SELECT TOP 1 p.player_id, p.current_team_id
        FROM players p
        INNER JOIN season_player_registrations spr ON p.player_id = spr.player_id
        WHERE spr.created_by = @userId
        ORDER BY spr.registered_at DESC
      `,
      { userId }
    );

    if (!playerResult.recordset || playerResult.recordset.length === 0) {
      res.status(404).json({ message: 'Player not found' });
      return;
    }

    const { player_id: playerId, current_team_id: teamId } = playerResult.recordset[0];

    if (!teamId) {
      res.status(404).json({ message: 'Player has no team assigned' });
      return;
    }

    // Get season_team_id for the current season
    const seasonTeamResult = await query<{ season_team_id: number }>(
      `
        SELECT TOP 1 stp.season_team_id
        FROM season_team_participants stp
        INNER JOIN teams t ON stp.team_id = t.team_id
        WHERE t.team_id = @teamId
        ORDER BY stp.joined_at DESC
      `,
      { teamId }
    );

    if (!seasonTeamResult.recordset || seasonTeamResult.recordset.length === 0) {
      res.status(404).json({ message: 'Team not found in any season' });
      return;
    }

    const seasonTeamId = seasonTeamResult.recordset[0].season_team_id;

    // Get matches for player's team
    const matchesQuery = `
      SELECT 
        m.match_id,
        CONVERT(VARCHAR(33), m.scheduled_kickoff, 127) as scheduled_kickoff,
        m.status,
        ht.name as home_team,
        at.name as away_team,
        m.home_score,
        m.away_score,
        s.name as venue
      FROM matches m
      INNER JOIN season_team_participants hstp ON m.home_season_team_id = hstp.season_team_id
      INNER JOIN teams ht ON hstp.team_id = ht.team_id
      INNER JOIN season_team_participants astp ON m.away_season_team_id = astp.season_team_id
      INNER JOIN teams at ON astp.team_id = at.team_id
      LEFT JOIN stadiums s ON m.stadium_id = s.stadium_id
      WHERE (m.home_season_team_id = @seasonTeamId OR m.away_season_team_id = @seasonTeamId)
      ORDER BY m.scheduled_kickoff DESC
    `;

    const matchesResult = await query(matchesQuery, { seasonTeamId });
    const matches = matchesResult.recordset || [];

    // Get season_player_id
    const seasonPlayerResult = await query<{ season_player_id: number }>(
      `SELECT season_player_id FROM season_player_registrations WHERE player_id = @playerId AND season_team_id = @seasonTeamId`,
      { playerId, seasonTeamId }
    );

    const seasonPlayerId = seasonPlayerResult.recordset[0]?.season_player_id;

    // Get player stats for each match
    const matchesWithStats = await Promise.all(
      matches.map(async (match) => {
        if (!seasonPlayerId) {
          return {
            matchId: match.match_id,
            homeTeam: match.home_team,
            awayTeam: match.away_team,
            homeScore: match.home_score,
            awayScore: match.away_score,
            scheduledKickoff: match.scheduled_kickoff,
            venue: match.venue,
            status: match.status,
            playerStats: null,
          };
        }

        // Get stats from player_match_stats
        const statsQuery = `
          SELECT 
            pms.goals,
            pms.assists,
            pms.minutes_played,
            pms.yellow_cards,
            pms.red_cards
          FROM player_match_stats pms
          WHERE pms.match_id = @matchId AND pms.season_player_id = @seasonPlayerId
        `;

        const statsResult = await query(statsQuery, {
          matchId: match.match_id,
          seasonPlayerId,
        });

        const stats = statsResult.recordset[0];
        const played = stats && stats.minutes_played && stats.minutes_played > 0;

        return {
          matchId: match.match_id,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          homeScore: match.home_score,
          awayScore: match.away_score,
          scheduledKickoff: match.scheduled_kickoff,
          venue: match.venue,
          status: match.status,
          playerStats: played
            ? {
                played: true,
                minutesPlayed: stats.minutes_played || 0,
                goals: stats.goals || 0,
                assists: stats.assists || 0,
                yellowCards: stats.yellow_cards || 0,
                redCards: stats.red_cards || 0,
              }
            : null,
        };
      })
    );

    res.json({
      data: matchesWithStats,
    });
  } catch (error) {
    console.error('Error fetching player matches:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
