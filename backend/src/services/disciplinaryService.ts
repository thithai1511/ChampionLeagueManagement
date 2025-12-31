/**
 * disciplinaryService.ts
 * Service for handling disciplinary actions: cards, suspensions
 */

import sql from 'mssql';
import { getPool } from '../db/sqlServer';

export interface CardSummary {
  seasonPlayerId: number;
  playerId: number;
  playerName: string;
  shirtNumber: number | null;
  teamId: number;
  teamName: string;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
}

export interface PlayerSuspension {
  suspensionId: number;
  seasonPlayerId: number;
  playerId: number;
  playerName: string;
  shirtNumber: number | null;
  teamId: number;
  teamName: string;
  reason: string;
  triggerMatchId: number | null;
  triggerMatchInfo: string | null;
  matchesBanned: number;
  startMatchId: number | null;
  startMatchInfo: string | null;
  servedMatches: number;
  status: string;
  notes: string | null;
  createdAt: Date;
}

/**
 * Get card summary for all players in a season
 */
export async function getCardSummary(seasonId: number): Promise<CardSummary[]> {
  const pool = await getPool();

  try {
    const result = await pool.request()
      .input('seasonId', sql.Int, seasonId)
      .query(`
        WITH CardCounts AS (
          SELECT 
            me.season_player_id,
            SUM(CASE WHEN me.event_type = 'CARD' AND me.card_type = 'YELLOW' THEN 1 ELSE 0 END) as yellow_cards,
            SUM(CASE WHEN me.event_type = 'CARD' AND me.card_type IN ('RED', 'SECOND_YELLOW') THEN 1 ELSE 0 END) as red_cards
          FROM match_events me
          INNER JOIN matches m ON me.match_id = m.match_id
          WHERE me.season_id = @seasonId
            AND me.event_type = 'CARD'
            AND me.season_player_id IS NOT NULL
            AND m.status = 'COMPLETED'
          GROUP BY me.season_player_id
        ),
        MatchesPlayed AS (
          SELECT 
            me.season_player_id,
            COUNT(DISTINCT me.match_id) as matches_played
          FROM match_events me
          INNER JOIN matches m ON me.match_id = m.match_id
          WHERE me.season_id = @seasonId
            AND m.status = 'COMPLETED'
          GROUP BY me.season_player_id
        )
        SELECT 
          cc.season_player_id,
          spr.player_id,
          p.full_name as player_name,
          spr.shirt_number,
          stp.team_id as team_id,
          t.name as team_name,
          ISNULL(cc.yellow_cards, 0) as yellow_cards,
          ISNULL(cc.red_cards, 0) as red_cards,
          ISNULL(mp.matches_played, 0) as matches_played
        FROM CardCounts cc
        INNER JOIN season_player_registrations spr ON cc.season_player_id = spr.season_player_id
        INNER JOIN players p ON spr.player_id = p.player_id
        INNER JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
        INNER JOIN teams t ON stp.team_id = t.team_id
        LEFT JOIN MatchesPlayed mp ON cc.season_player_id = mp.season_player_id
        ORDER BY cc.red_cards DESC, cc.yellow_cards DESC, p.full_name ASC
      `);

    return result.recordset.map(row => ({
      seasonPlayerId: row.season_player_id,
      playerId: row.player_id,
      playerName: row.player_name,
      shirtNumber: row.shirt_number,
      teamId: row.team_id,
      teamName: row.team_name,
      yellowCards: row.yellow_cards || 0,
      redCards: row.red_cards || 0,
      matchesPlayed: row.matches_played || 0
    }));
  } catch (error: any) {
    console.error('Error in getCardSummary:', error);
    // Return empty array if there's an error or no data
    if (error.message?.includes('Invalid object name') || error.message?.includes('does not exist')) {
      console.warn('Table or column does not exist, returning empty array');
      return [];
    }
    throw error;
  }
}

/**
 * Get suspensions for a season
 */
export async function getSuspensionsForSeason(seasonId: number, statusFilter?: string): Promise<PlayerSuspension[]> {
  const pool = await getPool();

  try {
    const request = pool.request().input('seasonId', sql.Int, seasonId);

    let statusClause = '';
    if (statusFilter) {
      request.input('status', sql.VarChar(16), statusFilter);
      statusClause = 'AND ps.status = @status';
    }

    const result = await request.query(`
      SELECT 
        ps.suspension_id,
        ps.season_player_id,
        spr.player_id,
        p.full_name as player_name,
        spr.shirt_number,
        stp.team_id as team_id,
        t.name as team_name,
        ps.reason,
        ps.trigger_match_id,
        CASE 
          WHEN tm.match_id IS NOT NULL AND ht.name IS NOT NULL AND at.name IS NOT NULL
          THEN CONCAT(ht.name, ' vs ', at.name, ' (', FORMAT(tm.scheduled_kickoff, 'dd/MM/yyyy'), ')')
          ELSE NULL 
        END as trigger_match_info,
        ps.matches_banned,
        ps.start_match_id,
        CASE 
          WHEN sm.match_id IS NOT NULL AND sht.name IS NOT NULL AND sat.name IS NOT NULL
          THEN CONCAT(sht.name, ' vs ', sat.name, ' (', FORMAT(sm.scheduled_kickoff, 'dd/MM/yyyy'), ')')
          ELSE NULL 
        END as start_match_info,
        ps.served_matches,
        ps.status,
        ps.notes,
        ps.created_at
      FROM player_suspensions ps
      INNER JOIN season_player_registrations spr ON ps.season_player_id = spr.season_player_id
      INNER JOIN players p ON spr.player_id = p.player_id
      INNER JOIN season_team_participants stp ON ps.season_team_id = stp.season_team_id
      INNER JOIN teams t ON stp.team_id = t.team_id
      LEFT JOIN matches tm ON ps.trigger_match_id = tm.match_id
      LEFT JOIN season_team_participants thp ON tm.home_season_team_id = thp.season_team_id
      LEFT JOIN teams ht ON thp.team_id = ht.team_id
      LEFT JOIN season_team_participants tap ON tm.away_season_team_id = tap.season_team_id
      LEFT JOIN teams at ON tap.team_id = at.team_id
      LEFT JOIN matches sm ON ps.start_match_id = sm.match_id
      LEFT JOIN season_team_participants shp ON sm.home_season_team_id = shp.season_team_id
      LEFT JOIN teams sht ON shp.team_id = sht.team_id
      LEFT JOIN season_team_participants sap ON sm.away_season_team_id = sap.season_team_id
      LEFT JOIN teams sat ON sap.team_id = sat.team_id
      WHERE ps.season_id = @seasonId
        ${statusClause}
      ORDER BY ps.created_at DESC
    `);

    return result.recordset.map(row => ({
      suspensionId: row.suspension_id,
      seasonPlayerId: row.season_player_id,
      playerId: row.player_id,
      playerName: row.player_name,
      shirtNumber: row.shirt_number,
      teamId: row.team_id,
      teamName: row.team_name,
      reason: row.reason,
      triggerMatchId: row.trigger_match_id,
      triggerMatchInfo: row.trigger_match_info,
      matchesBanned: row.matches_banned,
      startMatchId: row.start_match_id,
      startMatchInfo: row.start_match_info,
      servedMatches: row.served_matches || 0,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at
    }));
  } catch (error: any) {
    console.error('Error in getSuspensionsForSeason:', error);
    // Return empty array if there's an error or no data
    if (error.message?.includes('Invalid object name') || error.message?.includes('does not exist')) {
      console.warn('Table or column does not exist, returning empty array');
      return [];
    }
    throw error;
  }
}

/**
 * Check if a player is suspended for a specific match
 */
export async function isPlayerSuspendedForMatch(
  seasonId: number,
  matchId: number,
  seasonPlayerId: number
): Promise<{ suspended: boolean; reason?: string; suspensionId?: number }> {
  const pool = await getPool();

  const result = await pool.request()
    .input('seasonId', sql.Int, seasonId)
    .input('matchId', sql.Int, matchId)
    .input('seasonPlayerId', sql.Int, seasonPlayerId)
    .query(`
      SELECT TOP 1
        suspension_id,
        reason
      FROM player_suspensions
      WHERE season_id = @seasonId
        AND season_player_id = @seasonPlayerId
        AND start_match_id = @matchId
        AND status = 'active'
    `);

  if (result.recordset.length > 0) {
    return {
      suspended: true,
      reason: result.recordset[0].reason,
      suspensionId: result.recordset[0].suspension_id
    };
  }

  return { suspended: false };
}

/**
 * Recalculate disciplinary records for a season
 * This will archive old suspensions and create new ones based on current card counts
 */
export async function recalculateDisciplinaryForSeason(seasonId: number): Promise<{
  archived: number;
  created: number;
  errors: string[];
}> {
  console.log(`[recalculateDisciplinaryForSeason] Starting for season ${seasonId}`);
  const pool = await getPool();
  const transaction = pool.transaction();

  try {
    await transaction.begin();
    console.log(`[recalculateDisciplinaryForSeason] Transaction begun`);

    // Check if player_suspensions table exists
    const tableCheck = await transaction.request()
      .query(`
        SELECT COUNT(*) as table_exists
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'player_suspensions'
      `);

    if (tableCheck.recordset[0].table_exists === 0) {
      throw new Error('Table player_suspensions does not exist. Please run migrations first.');
    }

    // Archive all existing suspensions for this season
    let archived = 0;
    try {
      const archiveResult = await transaction.request()
        .input('seasonId', sql.Int, seasonId)
        .query(`
          UPDATE player_suspensions
          SET status = 'archived', updated_at = SYSUTCDATETIME()
          WHERE season_id = @seasonId AND status IN ('active', 'served')
        `);
      archived = archiveResult.rowsAffected[0] || 0;
    } catch (archiveErr: any) {
      // If no rows to update, that's okay
      if (!archiveErr.message?.includes('Invalid object name')) {
        throw archiveErr;
      }
      console.log(`[recalculateDisciplinaryForSeason] No existing suspensions to archive`);
    }

    // Get card counts for all players
    console.log(`[recalculateDisciplinaryForSeason] Querying card counts...`);
    let cardsResult;
    try {
      cardsResult = await transaction.request()
        .input('seasonId', sql.Int, seasonId)
        .query(`
          SELECT 
            me.season_player_id,
            spr.season_team_id,
            SUM(CASE WHEN me.card_type = 'YELLOW' THEN 1 ELSE 0 END) as yellow_count,
            SUM(CASE WHEN me.card_type IN ('RED', 'SECOND_YELLOW') THEN 1 ELSE 0 END) as red_count,
            MAX(CASE WHEN me.card_type = 'YELLOW' THEN me.match_id END) as last_yellow_match,
            MAX(CASE WHEN me.card_type IN ('RED', 'SECOND_YELLOW') THEN me.match_id END) as last_red_match
          FROM match_events me
          INNER JOIN matches m ON me.match_id = m.match_id
          INNER JOIN season_player_registrations spr ON me.season_player_id = spr.season_player_id
          WHERE me.season_id = @seasonId
            AND me.event_type = 'CARD'
            AND me.season_player_id IS NOT NULL
            AND m.status = 'completed'
          GROUP BY me.season_player_id, spr.season_team_id
          HAVING SUM(CASE WHEN me.card_type IN ('RED', 'SECOND_YELLOW') THEN 1 ELSE 0 END) >= 1
             OR SUM(CASE WHEN me.card_type = 'YELLOW' THEN 1 ELSE 0 END) >= 2
        `);
    } catch (queryErr: any) {
      console.error(`[recalculateDisciplinaryForSeason] Error querying cards:`, queryErr);
      throw new Error(`Failed to query card counts: ${queryErr.message || queryErr}`);
    }

    console.log(`[recalculateDisciplinaryForSeason] Found ${cardsResult.recordset.length} players with cards`);
    let created = 0;
    const errors: string[] = [];

    // Create new suspensions
    for (const player of cardsResult.recordset) {
      try {
        // Red card suspension
        if (player.red_count >= 1 && player.last_red_match) {
          // Find next match for this player's team after the red card match
          const nextMatchResult = await transaction.request()
            .input('seasonId', sql.Int, seasonId)
            .input('seasonTeamId', sql.Int, player.season_team_id)
            .input('afterMatchId', sql.Int, player.last_red_match)
            .query(`
              SELECT TOP 1 m.match_id
              FROM matches m
              WHERE m.season_id = @seasonId
                AND (m.home_season_team_id = @seasonTeamId OR m.away_season_team_id = @seasonTeamId)
                AND m.scheduled_kickoff > (SELECT scheduled_kickoff FROM matches WHERE match_id = @afterMatchId)
                AND m.status IN ('scheduled', 'in_progress')
              ORDER BY m.scheduled_kickoff ASC
            `);

          const startMatchId = nextMatchResult.recordset.length > 0
            ? nextMatchResult.recordset[0].match_id
            : null;

          // Build INSERT query based on whether startMatchId is null
          if (startMatchId !== null) {
            await transaction.request()
              .input('seasonId', sql.Int, seasonId)
              .input('seasonPlayerId', sql.Int, player.season_player_id)
              .input('seasonTeamId', sql.Int, player.season_team_id)
              .input('reason', sql.VarChar(32), 'RED_CARD')
              .input('triggerMatchId', sql.Int, player.last_red_match)
              .input('matchesBanned', sql.TinyInt, 1)
              .input('startMatchId', sql.Int, startMatchId)
              .query(`
                  INSERT INTO player_suspensions 
                    (season_id, season_player_id, season_team_id, reason, trigger_match_id, matches_banned, start_match_id, status)
                  VALUES 
                    (@seasonId, @seasonPlayerId, @seasonTeamId, @reason, @triggerMatchId, @matchesBanned, @startMatchId, 'active')
                `);
          } else {
            await transaction.request()
              .input('seasonId', sql.Int, seasonId)
              .input('seasonPlayerId', sql.Int, player.season_player_id)
              .input('seasonTeamId', sql.Int, player.season_team_id)
              .input('reason', sql.VarChar(32), 'RED_CARD')
              .input('triggerMatchId', sql.Int, player.last_red_match)
              .input('matchesBanned', sql.TinyInt, 1)
              .query(`
                  INSERT INTO player_suspensions 
                    (season_id, season_player_id, season_team_id, reason, trigger_match_id, matches_banned, start_match_id, status)
                  VALUES 
                    (@seasonId, @seasonPlayerId, @seasonTeamId, @reason, @triggerMatchId, @matchesBanned, NULL, 'active')
                `);
          }

          created++;
        }

        // Two yellow cards suspension
        if (player.yellow_count >= 2 && player.last_yellow_match) {
          const nextMatchResult = await transaction.request()
            .input('seasonId', sql.Int, seasonId)
            .input('seasonTeamId', sql.Int, player.season_team_id)
            .input('afterMatchId', sql.Int, player.last_yellow_match)
            .query(`
              SELECT TOP 1 m.match_id
              FROM matches m
              WHERE m.season_id = @seasonId
                AND (m.home_season_team_id = @seasonTeamId OR m.away_season_team_id = @seasonTeamId)
                AND m.scheduled_kickoff > (SELECT scheduled_kickoff FROM matches WHERE match_id = @afterMatchId)
                AND m.status IN ('scheduled', 'in_progress')
              ORDER BY m.scheduled_kickoff ASC
            `);

          const startMatchId = nextMatchResult.recordset.length > 0
            ? nextMatchResult.recordset[0].match_id
            : null;

          // Check if we already created a red card suspension for this player
          const existingRedCard = await transaction.request()
            .input('seasonId', sql.Int, seasonId)
            .input('seasonPlayerId', sql.Int, player.season_player_id)
            .input('reason', sql.VarChar(32), 'RED_CARD')
            .query(`
              SELECT suspension_id 
              FROM player_suspensions 
              WHERE season_id = @seasonId 
                AND season_player_id = @seasonPlayerId 
                AND reason = @reason 
                AND status = 'active'
            `);

          // Only create yellow suspension if no red card suspension exists
          if (existingRedCard.recordset.length === 0) {
            if (startMatchId !== null) {
              await transaction.request()
                .input('seasonId', sql.Int, seasonId)
                .input('seasonPlayerId', sql.Int, player.season_player_id)
                .input('seasonTeamId', sql.Int, player.season_team_id)
                .input('reason', sql.VarChar(32), 'TWO_YELLOW_CARDS')
                .input('triggerMatchId', sql.Int, player.last_yellow_match)
                .input('matchesBanned', sql.TinyInt, 1)
                .input('startMatchId', sql.Int, startMatchId)
                .query(`
                    INSERT INTO player_suspensions 
                      (season_id, season_player_id, season_team_id, reason, trigger_match_id, matches_banned, start_match_id, status)
                    VALUES 
                      (@seasonId, @seasonPlayerId, @seasonTeamId, @reason, @triggerMatchId, @matchesBanned, @startMatchId, 'active')
                  `);
            } else {
              await transaction.request()
                .input('seasonId', sql.Int, seasonId)
                .input('seasonPlayerId', sql.Int, player.season_player_id)
                .input('seasonTeamId', sql.Int, player.season_team_id)
                .input('reason', sql.VarChar(32), 'TWO_YELLOW_CARDS')
                .input('triggerMatchId', sql.Int, player.last_yellow_match)
                .input('matchesBanned', sql.TinyInt, 1)
                .query(`
                    INSERT INTO player_suspensions 
                      (season_id, season_player_id, season_team_id, reason, trigger_match_id, matches_banned, start_match_id, status)
                    VALUES 
                      (@seasonId, @seasonPlayerId, @seasonTeamId, @reason, @triggerMatchId, @matchesBanned, NULL, 'active')
                  `);
            }

            created++;
          }
        }
      } catch (err: any) {
        errors.push(`Player ${player.season_player_id}: ${err.message}`);
      }
    }

    await transaction.commit();
    console.log(`[recalculateDisciplinaryForSeason] Completed: archived=${archived}, created=${created}, errors=${errors.length}`);

    return { archived, created, errors };
  } catch (err: any) {
    console.error(`[recalculateDisciplinaryForSeason] Error occurred:`, err);
    console.error(`[recalculateDisciplinaryForSeason] Error details:`, {
      message: err.message,
      code: err.code,
      number: err.number,
      originalError: err.originalError,
      info: err.info
    });

    try {
      await transaction.rollback();
      console.log(`[recalculateDisciplinaryForSeason] Transaction rolled back`);
    } catch (rollbackErr) {
      console.error(`[recalculateDisciplinaryForSeason] Rollback failed:`, rollbackErr);
    }

    throw err;
  }
}

/**
 * Get players currently suspended (active suspensions)
 */
export async function getActiveSuspensions(seasonId: number): Promise<PlayerSuspension[]> {
  return getSuspensionsForSeason(seasonId, 'active');
}
