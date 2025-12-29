import { query } from "../db/sqlServer";
import * as matchLifecycleService from "./matchLifecycleService";

export interface MatchLineup {
    matchLineupId: number;
    matchId: number;
    seasonId: number;
    seasonTeamId: number;
    playerId: number;
    jerseyNumber?: number;
    position?: string;
    isStarting: boolean;
    isCaptain: boolean;
    minutesPlayed?: number;
    status: string; // 'active', 'subbed_out', 'subbed_in', 'bench'
}

export const getMatchLineups = async (matchId: number): Promise<MatchLineup[]> => {
    const result = await query(
        `
      SELECT 
        match_lineup_id as matchLineupId,
        match_id as matchId,
        season_id as seasonId,
        season_team_id as seasonTeamId,
        player_id as playerId,
        jersey_number as jerseyNumber,
        position,
        is_starting as isStarting,
        is_captain as isCaptain,
        minutes_played as minutesPlayed,
        status
      FROM match_lineups
      WHERE match_id = @matchId
    `,
        { matchId }
    );
    return result.recordset;
};

export const upsertMatchLineup = async (input: Partial<MatchLineup>): Promise<void> => {
    // Check if player already in lineup for this match, then update, else insert.
    const checkSql = `SELECT match_lineup_id FROM match_lineups WHERE match_id = @matchId AND player_id = @playerId`;
    const existing = await query(checkSql, { matchId: input.matchId, playerId: input.playerId });

    if (existing.recordset.length > 0) {
        // Update
        await query(`
      UPDATE match_lineups
      SET 
        season_team_id = @seasonTeamId,
        jersey_number = @jerseyNumber,
        position = @position,
        is_starting = @isStarting,
        is_captain = @isCaptain,
        status = @status,
        updated_at = GETDATE()
      WHERE match_lineup_id = @id
    `, {
            id: existing.recordset[0].match_lineup_id,
            seasonTeamId: input.seasonTeamId,
            jerseyNumber: input.jerseyNumber,
            position: input.position,
            isStarting: input.isStarting,
            isCaptain: input.isCaptain,
            status: input.status
        });
    } else {
        // Insert
        await query(`
      INSERT INTO match_lineups (
        match_id, season_id, season_team_id, player_id, 
        jersey_number, position, is_starting, is_captain, status
      ) VALUES (
        @matchId, @seasonId, @seasonTeamId, @playerId,
        @jerseyNumber, @position, @isStarting, @isCaptain, @status
      )
    `, {
            matchId: input.matchId,
            seasonId: input.seasonId,
            seasonTeamId: input.seasonTeamId,
            playerId: input.playerId,
            jerseyNumber: input.jerseyNumber,
            position: input.position,
            isStarting: input.isStarting,
            isCaptain: input.isCaptain,
            status: input.status
        });
    }
};

/**
 * Approve lineup for a team
 * Part of match lifecycle workflow
 */
export const approveLineup = async (
    matchId: number,
    teamType: 'home' | 'away',
    approvedBy: number
): Promise<void> => {
    await query(`
        UPDATE match_lineups
        SET approval_status = 'APPROVED',
            approved_by = @approvedBy,
            approved_at = GETDATE()
        WHERE match_id = @matchId
        AND team_type = @teamType
    `, { matchId, teamType, approvedBy });

    // Check if both lineups are approved
    const bothApproved = await checkBothLineupsApproved(matchId);
    if (bothApproved) {
        // Dynamically import to avoid circular dependency
        const lifecycleService = await import('./matchLifecycleService');
        await lifecycleService.changeMatchStatus(matchId, 'READY', { 
            note: 'Both lineups approved',
            changedBy: approvedBy 
        });
    }
};

/**
 * Reject lineup for a team
 */
export const rejectLineup = async (
    matchId: number,
    teamType: 'home' | 'away',
    reason: string,
    rejectedBy: number
): Promise<void> => {
    await query(`
        UPDATE match_lineups
        SET approval_status = 'REJECTED',
            rejection_reason = @reason,
            approved_by = @rejectedBy,
            approved_at = GETDATE()
        WHERE match_id = @matchId
        AND team_type = @teamType
    `, { matchId, teamType, reason, rejectedBy });
};

/**
 * Check if both home and away lineups are approved
 */
const checkBothLineupsApproved = async (matchId: number): Promise<boolean> => {
    const result = await query(`
        SELECT COUNT(DISTINCT team_type) as approved_teams
        FROM match_lineups
        WHERE match_id = @matchId
        AND approval_status = 'APPROVED'
        AND team_type IN ('home', 'away')
    `, { matchId });

    return result.recordset[0]?.approved_teams === 2;
};

/**
 * Get lineup approval status for a match
 */
export const getLineupApprovalStatus = async (matchId: number): Promise<{
    homeStatus: string;
    awayStatus: string;
}> => {
    const result = await query(`
        SELECT 
            team_type,
            approval_status
        FROM match_lineups
        WHERE match_id = @matchId
        AND team_type IN ('home', 'away')
        GROUP BY team_type, approval_status
    `, { matchId });

    const statuses = result.recordset.reduce((acc: any, row: any) => {
        if (row.team_type === 'home') acc.homeStatus = row.approval_status;
        if (row.team_type === 'away') acc.awayStatus = row.approval_status;
        return acc;
    }, { homeStatus: 'PENDING', awayStatus: 'PENDING' });

    return statuses;
};
