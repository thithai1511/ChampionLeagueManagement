import { query } from "../db/sqlServer";

/**
 * BTC Requirements for Match Lineup - Quy định khi thi đấu
 */
export const LINEUP_REQUIREMENTS = {
    STARTING_PLAYERS: 11,           // Đúng 11 cầu thủ chính thức
    MIN_SUBSTITUTES: 1,             // Tối thiểu 1 dự bị
    MAX_SUBSTITUTES: 5,             // Tối đa 5 dự bị
    TOTAL_LINEUP: 16,               // Tổng 16 cầu thủ
    MAX_FOREIGN_IN_STARTING: 3,     // Tối đa 3 ngoại binh trong đội hình chính
};

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
        COALESCE(match_lineup_id, lineup_id) as matchLineupId,
        match_id as matchId,
        season_id as seasonId,
        season_team_id as seasonTeamId,
        player_id as playerId,
        jersey_number as jerseyNumber,
        position,
        COALESCE(is_starting, 1) as isStarting,
        COALESCE(is_captain, 0) as isCaptain,
        minutes_played as minutesPlayed,
        COALESCE(status, 'active') as status
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

/**
 * Validate lineup before submission
 * Kiểm tra danh sách thi đấu theo quy định BTC
 */
export interface LineupValidationInput {
    matchId: number;
    seasonId: number;
    seasonTeamId: number;
    startingPlayerIds: number[];
    substitutePlayerIds: number[];
}

export interface LineupValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export const validateLineup = async (input: LineupValidationInput): Promise<LineupValidationResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check số lượng cầu thủ chính thức (đúng 11)
    if (input.startingPlayerIds.length !== LINEUP_REQUIREMENTS.STARTING_PLAYERS) {
        errors.push(`Phải có đúng ${LINEUP_REQUIREMENTS.STARTING_PLAYERS} cầu thủ chính thức (hiện tại: ${input.startingPlayerIds.length})`);
    }

    // 2. Check số lượng dự bị (1-5)
    if (input.substitutePlayerIds.length < LINEUP_REQUIREMENTS.MIN_SUBSTITUTES) {
        errors.push(`Phải có tối thiểu ${LINEUP_REQUIREMENTS.MIN_SUBSTITUTES} cầu thủ dự bị`);
    }
    if (input.substitutePlayerIds.length > LINEUP_REQUIREMENTS.MAX_SUBSTITUTES) {
        errors.push(`Tối đa ${LINEUP_REQUIREMENTS.MAX_SUBSTITUTES} cầu thủ dự bị (hiện tại: ${input.substitutePlayerIds.length})`);
    }

    // 3. Check duplicate players
    const allPlayerIds = [...input.startingPlayerIds, ...input.substitutePlayerIds];
    const uniquePlayerIds = new Set(allPlayerIds);
    if (uniquePlayerIds.size !== allPlayerIds.length) {
        errors.push('Có cầu thủ bị trùng lặp trong danh sách');
    }

    // 4. Check foreign players in starting lineup (max 3)
    if (input.startingPlayerIds.length > 0) {
        const foreignCount = await countForeignPlayersInList(input.startingPlayerIds);
        if (foreignCount > LINEUP_REQUIREMENTS.MAX_FOREIGN_IN_STARTING) {
            errors.push(`Tối đa ${LINEUP_REQUIREMENTS.MAX_FOREIGN_IN_STARTING} cầu thủ ngoại trong đội hình chính (hiện tại: ${foreignCount})`);
        }
    }

    // 5. Check suspended players (thẻ vàng 2 lần hoặc thẻ đỏ)
    const suspendedPlayers = await getSuspendedPlayersInList(allPlayerIds, input.seasonId);
    if (suspendedPlayers.length > 0) {
        const names = suspendedPlayers.map(p => p.player_name).join(', ');
        errors.push(`Cầu thủ đang bị treo giò không được thi đấu: ${names}`);
    }

    // 6. Check if players belong to the team
    const invalidPlayers = await getPlayersNotInTeam(allPlayerIds, input.seasonTeamId, input.seasonId);
    if (invalidPlayers.length > 0) {
        const names = invalidPlayers.map(p => p.player_name).join(', ');
        errors.push(`Cầu thủ không thuộc đội bóng: ${names}`);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Count foreign players in a list of player IDs
 */
async function countForeignPlayersInList(playerIds: number[]): Promise<number> {
    if (playerIds.length === 0) return 0;

    const placeholders = playerIds.map((_, i) => `@p${i}`).join(',');
    const params: Record<string, number> = {};
    playerIds.forEach((id, i) => { params[`p${i}`] = id; });

    const result = await query<{ cnt: number }>(`
        SELECT COUNT(*) as cnt
        FROM players
        WHERE player_id IN (${placeholders})
        AND (nationality NOT IN ('Vietnam', 'Việt Nam', 'VN') OR nationality IS NULL)
    `, params);

    return result.recordset[0]?.cnt || 0;
}

/**
 * Get suspended players from a list
 * Players with 2+ yellow cards or 1+ red cards in the current season
 */
async function getSuspendedPlayersInList(playerIds: number[], seasonId: number): Promise<{ player_id: number; player_name: string }[]> {
    if (playerIds.length === 0) return [];

    const placeholders = playerIds.map((_, i) => `@p${i}`).join(',');
    const params: Record<string, any> = { seasonId };
    playerIds.forEach((id, i) => { params[`p${i}`] = id; });

    const result = await query<{ player_id: number; player_name: string }>(`
        SELECT DISTINCT p.player_id, p.name as player_name
        FROM players p
        INNER JOIN disciplinary_records dr ON p.player_id = dr.player_id
        WHERE p.player_id IN (${placeholders})
        AND dr.season_id = @seasonId
        AND dr.is_suspended = 1
        AND (dr.suspension_end_date IS NULL OR dr.suspension_end_date > GETDATE())
    `, params);

    return result.recordset;
}

/**
 * Get players that don't belong to the team
 */
async function getPlayersNotInTeam(playerIds: number[], seasonTeamId: number, seasonId: number): Promise<{ player_id: number; player_name: string }[]> {
    if (playerIds.length === 0) return [];

    const placeholders = playerIds.map((_, i) => `@p${i}`).join(',');
    const params: Record<string, any> = { seasonTeamId, seasonId };
    playerIds.forEach((id, i) => { params[`p${i}`] = id; });

    // Get players in the list that are NOT registered for this team in this season
    const result = await query<{ player_id: number; player_name: string }>(`
        SELECT p.player_id, p.name as player_name
        FROM players p
        WHERE p.player_id IN (${placeholders})
        AND NOT EXISTS (
            SELECT 1 FROM season_player_registrations spr
            WHERE spr.player_id = p.player_id
            AND spr.season_team_id = @seasonTeamId
            AND spr.season_id = @seasonId
            AND spr.registration_status = 'APPROVED'
        )
    `, params);

    return result.recordset;
}

/**
 * Submit lineup for a team with validation
 */
export const submitLineup = async (
    input: LineupValidationInput,
    submittedBy: number
): Promise<{ success: boolean; errors?: string[] }> => {
    // Validate first
    const validation = await validateLineup(input);
    if (!validation.valid) {
        return { success: false, errors: validation.errors };
    }

    // Determine team type based on match info
    const matchInfo = await query<{ home_season_team_id: number; away_season_team_id: number }>(`
        SELECT home_season_team_id, away_season_team_id
        FROM matches
        WHERE match_id = @matchId
    `, { matchId: input.matchId });

    if (!matchInfo.recordset[0]) {
        return { success: false, errors: ['Không tìm thấy thông tin trận đấu'] };
    }

    const teamType = matchInfo.recordset[0].home_season_team_id === input.seasonTeamId ? 'home' : 'away';

    // Clear existing lineup for this team
    await query(`
        DELETE FROM match_lineups
        WHERE match_id = @matchId
        AND season_team_id = @seasonTeamId
    `, { matchId: input.matchId, seasonTeamId: input.seasonTeamId });

    // Insert starting players
    for (const playerId of input.startingPlayerIds) {
        await upsertMatchLineup({
            matchId: input.matchId,
            seasonId: input.seasonId,
            seasonTeamId: input.seasonTeamId,
            playerId,
            isStarting: true,
            isCaptain: false,
            status: 'active'
        });
    }

    // Insert substitutes
    for (const playerId of input.substitutePlayerIds) {
        await upsertMatchLineup({
            matchId: input.matchId,
            seasonId: input.seasonId,
            seasonTeamId: input.seasonTeamId,
            playerId,
            isStarting: false,
            isCaptain: false,
            status: 'bench'
        });
    }

    // Update team_type and set status to SUBMITTED
    await query(`
        UPDATE match_lineups
        SET team_type = @teamType,
            approval_status = 'SUBMITTED',
            submitted_at = GETDATE()
        WHERE match_id = @matchId
        AND season_team_id = @seasonTeamId
    `, { matchId: input.matchId, seasonTeamId: input.seasonTeamId, teamType });

    return { success: true };
};
