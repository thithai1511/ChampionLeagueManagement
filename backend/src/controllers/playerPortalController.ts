import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import pool from '../config/database';

/**
 * Get current player's profile
 */
export async function getPlayerProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Get player information from database
    const playerQuery = `
      SELECT 
        p.player_id,
        p.name as full_name,
        p.position,
        p.shirt_number as jersey_number,
        p.nationality,
        p.date_of_birth,
        p.place_of_birth,
        p.height,
        p.weight,
        p.avatar_url,
        t.name as team_name,
        t.logo_url as team_logo,
        ua.email,
        ua.phone_number as phone
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id
      LEFT JOIN user_accounts ua ON p.user_id = ua.user_id
      WHERE p.user_id = @userId
    `;

    const result = await pool.query(playerQuery, { userId });
    
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
    const userId = req.user?.userId;
    const { phoneNumber, email } = req.body;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Players can only update contact information
    const updateQuery = `
      UPDATE user_accounts
      SET 
        phone_number = COALESCE(@phoneNumber, phone_number),
        email = COALESCE(@email, email),
        updated_at = GETDATE()
      WHERE user_id = @userId
    `;

    await pool.query(updateQuery, { userId, phoneNumber, email });

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
    const userId = req.user?.userId;
    const season = req.query.season as string || '2025';

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Get player ID from user ID
    const playerResult = await pool.query(
      'SELECT player_id FROM players WHERE user_id = @userId',
      { userId }
    );

    if (!playerResult.recordset || playerResult.recordset.length === 0) {
      res.status(404).json({ message: 'Player not found' });
      return;
    }

    const playerId = playerResult.recordset[0].player_id;

    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT me.match_id) as matches_played,
        COALESCE(SUM(CASE WHEN me.event_type = 'goal' THEN 1 ELSE 0 END), 0) as goals,
        COALESCE(SUM(CASE WHEN me.event_type = 'assist' THEN 1 ELSE 0 END), 0) as assists,
        COALESCE(SUM(me.minutes_played), 0) as minutes_played,
        COALESCE(SUM(CASE WHEN me.event_type = 'yellow_card' THEN 1 ELSE 0 END), 0) as yellow_cards,
        COALESCE(SUM(CASE WHEN me.event_type = 'red_card' THEN 1 ELSE 0 END), 0) as red_cards
      FROM match_events me
      INNER JOIN matches m ON me.match_id = m.match_id
      WHERE me.player_id = @playerId
        AND m.season = @season
    `;

    const statsResult = await pool.query(statsQuery, { playerId, season });
    const stats = statsResult.recordset[0];

    // Get monthly goals
    const monthlyGoalsQuery = `
      SELECT 
        MONTH(m.match_date) as month,
        COUNT(*) as goals
      FROM match_events me
      INNER JOIN matches m ON me.match_id = m.match_id
      WHERE me.player_id = @playerId
        AND me.event_type = 'goal'
        AND m.season = @season
      GROUP BY MONTH(m.match_date)
      ORDER BY MONTH(m.match_date)
    `;

    const monthlyResult = await pool.query(monthlyGoalsQuery, { playerId, season });

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
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Get player and team information
    const playerResult = await pool.query(
      'SELECT player_id, team_id FROM players WHERE user_id = @userId',
      { userId }
    );

    if (!playerResult.recordset || playerResult.recordset.length === 0) {
      res.status(404).json({ message: 'Player not found' });
      return;
    }

    const { player_id: playerId, team_id: teamId } = playerResult.recordset[0];

    // Get matches for player's team
    const matchesQuery = `
      SELECT 
        m.match_id,
        m.match_date,
        m.match_time,
        m.venue,
        m.status,
        ht.name as home_team,
        at.name as away_team,
        m.home_score,
        m.away_score
      FROM matches m
      INNER JOIN teams ht ON m.home_team_id = ht.team_id
      INNER JOIN teams at ON m.away_team_id = at.team_id
      WHERE (m.home_team_id = @teamId OR m.away_team_id = @teamId)
      ORDER BY m.match_date DESC, m.match_time DESC
    `;

    const matchesResult = await pool.query(matchesQuery, { teamId });
    const matches = matchesResult.recordset || [];

    // Get player stats for each match
    const matchesWithStats = await Promise.all(
      matches.map(async (match) => {
        const statsQuery = `
          SELECT 
            SUM(CASE WHEN event_type = 'goal' THEN 1 ELSE 0 END) as goals,
            SUM(CASE WHEN event_type = 'assist' THEN 1 ELSE 0 END) as assists,
            MAX(minutes_played) as minutes_played,
            SUM(CASE WHEN event_type = 'yellow_card' THEN 1 ELSE 0 END) as yellow_cards,
            SUM(CASE WHEN event_type = 'red_card' THEN 1 ELSE 0 END) as red_cards
          FROM match_events
          WHERE match_id = @matchId AND player_id = @playerId
        `;

        const statsResult = await pool.query(statsQuery, {
          matchId: match.match_id,
          playerId,
        });

        const stats = statsResult.recordset[0];
        const played = stats && stats.minutes_played > 0;

        return {
          matchId: match.match_id,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          homeScore: match.home_score,
          awayScore: match.away_score,
          matchDate: match.match_date,
          matchTime: match.match_time,
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
