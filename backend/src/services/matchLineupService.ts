import { query } from "../db/sqlServer";
// import { canTeamParticipate } from "./participationFeeService"; // Giữ lại nếu cần, hoặc xóa nếu không dùng

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
        ml.lineup_id as matchLineupId,   -- Đổi tên alias này cho khớp với interface
        ml.match_id as matchId,
        ml.season_id as seasonId,
        ml.season_team_id as seasonTeamId,
        ml.player_id as playerId,
        -- Ưu tiên lấy số áo trong trận, nếu không có thì lấy số áo đăng ký
        COALESCE(ml.jersey_number, spr.shirt_number) as jerseyNumber,
        COALESCE(ml.position, spr.position_code, p.preferred_position) as position,
        COALESCE(ml.is_starting, 0) as isStarting,
        COALESCE(ml.is_captain, 0) as isCaptain,
        ml.minutes_played as minutesPlayed,
        COALESCE(ml.status, 'pending') as status,
        -- Lấy thêm tên cầu thủ để hiển thị
        p.full_name as playerName,
        spr.season_player_id as seasonPlayerId
      FROM match_lineups ml
      LEFT JOIN players p ON ml.player_id = p.player_id
      LEFT JOIN season_player_registrations spr ON ml.player_id = spr.player_id 
        AND ml.season_id = spr.season_id 
        AND ml.season_team_id = spr.season_team_id
      WHERE ml.match_id = @matchId
      ORDER BY ml.is_starting DESC, ml.jersey_number ASC
    `,
        { matchId }
    );
    return result.recordset;
};

export const upsertMatchLineup = async (input: Partial<MatchLineup> & { submittedBy?: number }): Promise<void> => {
    // Validate required fields
    if (!input.matchId || !input.seasonId || !input.seasonTeamId || !input.playerId) {
        throw new Error('Missing required fields: matchId, seasonId, seasonTeamId, playerId');
    }

    // Check if player already in lineup for this match, then update, else insert.
    const checkSql = `SELECT lineup_id FROM match_lineups WHERE match_id = @matchId AND player_id = @playerId`;
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
      WHERE lineup_id = @id
    `, {
            id: existing.recordset[0].lineup_id,
            seasonTeamId: input.seasonTeamId,
            jerseyNumber: input.jerseyNumber,
            position: input.position,
            isStarting: input.isStarting,
            isCaptain: input.isCaptain,
            status: input.status
        });
    } else {
        // Insert - submitted_by is required (NOT NULL constraint)
        const submittedBy = input.submittedBy || 1; // Fallback to 1 if not provided
        await query(`
      INSERT INTO match_lineups (
        match_id, season_id, season_team_id, player_id, 
        jersey_number, position, is_starting, is_captain, status, submitted_by
      ) VALUES (
        @matchId, @seasonId, @seasonTeamId, @playerId,
        @jerseyNumber, @position, @isStarting, @isCaptain, @status, @submittedBy
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
            status: input.status,
            submittedBy: submittedBy
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
    formation?: string;   // e.g. '4-4-2', '4-3-3'
    kitType?: string;     // 'HOME' (Chính thức) | 'AWAY' (Dự bị)
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

    if (input.kitType && !['HOME', 'AWAY'].includes(input.kitType)) {
        errors.push("kitType chỉ được HOME hoặc AWAY");
    }

    if (input.formation && !/^\d(-\d){2,3}$/.test(input.formation)) {
        errors.push("formation không hợp lệ (vd: 4-4-2, 4-3-3, 4-2-3-1)");
    }

    // 6. Check if players belong to the team
    // TEMPORARILY DISABLED - players table doesn't have team registrations set up yet
    /*
    const invalidPlayers = await getPlayersNotInTeam(allPlayerIds, input.seasonTeamId, input.seasonId);
    if (invalidPlayers.length > 0) {
        const names = invalidPlayers.map(p => p.player_name).join(', ');
        errors.push(`Cầu thủ không thuộc đội bóng: ${names}`);
    }
    */

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
        SELECT DISTINCT p.player_id, p.full_name as player_name
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
        SELECT p.player_id, p.full_name as player_name
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
    try {
        // Validate submittedBy
        if (!submittedBy || !Number.isInteger(submittedBy)) {
            return { success: false, errors: ['User ID is required to submit lineup'] };
        }

        // 0. Check Participation Fee (via season_team_registrations source of truth)
        // Need to resolve team_id from season_team_id first.

        const teamInfo = await query<{ team_id: number; season_id: number }>(`
            SELECT team_id, season_id FROM season_team_participants WHERE season_team_id = @seasonTeamId
        `, { seasonTeamId: input.seasonTeamId });

        if (!teamInfo.recordset[0]) {
            return { success: false, errors: ['Không tìm thấy thông tin đội bóng mùa giải'] };
        }
        const { team_id, season_id } = teamInfo.recordset[0];

        const feeInfo = await query<{ fee_status: string }>(`
            SELECT fee_status FROM season_team_registrations 
            WHERE season_id = @seasonId AND team_id = @teamId
        `, { seasonId: season_id, teamId: team_id });

        const status = feeInfo.recordset[0]?.fee_status;

        if (!feeInfo.recordset[0]) {
            return { success: false, errors: ['Đội bóng chưa đăng ký tham gia mùa giải (Registration not found)'] };
        }

        if (status !== 'paid' && status !== 'waived') {
            return { success: false, errors: [`Đội bóng chưa hoàn thành nghĩa vụ lệ phí (Status: ${status || 'unknown'})`] };
        }

        // Validate first
        const validation = await validateLineup(input);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        // Determine team type based on match info
        const matchInfo = await query<{ home_season_team_id: number; away_season_team_id: number; status: string }>(`
            SELECT home_season_team_id, away_season_team_id, status
            FROM matches
            WHERE match_id = @matchId
        `, { matchId: input.matchId });

        if (!matchInfo.recordset[0]) {
            return { success: false, errors: ['Không tìm thấy thông tin trận đấu'] };
        }

        // === START RESOLVED CONFLICT ===
        const { home_season_team_id, away_season_team_id, status: matchStatus } = matchInfo.recordset[0];

        // Check from MAIN: Prevent editing if match is completed
        if (matchStatus === 'completed') {
            return { success: false, errors: ['Không thể sửa đội hình của trận đấu đã kết thúc'] };
        }

        // Logic from LEPHI: Determine Home/Away safely
        let teamType: 'home' | 'away';
        if (home_season_team_id === input.seasonTeamId) teamType = 'home';
        else if (away_season_team_id === input.seasonTeamId) teamType = 'away';
        else return { success: false, errors: ['Đội không thuộc trận đấu này'] };
        // === END RESOLVED CONFLICT ===

        // Clear existing lineup for this team
        await query(`
            DELETE FROM match_lineups
            WHERE match_id = @matchId
            AND season_team_id = @seasonTeamId
        `, { matchId: input.matchId, seasonTeamId: input.seasonTeamId });

        // Insert starting players
        for (const playerId of input.startingPlayerIds) {
            if (!playerId || !Number.isInteger(playerId)) {
                throw new Error(`Invalid playerId in startingPlayerIds: ${playerId}`);
            }
            await upsertMatchLineup({
                matchId: input.matchId,
                seasonId: input.seasonId,
                seasonTeamId: input.seasonTeamId,
                playerId,
                isStarting: true,
                isCaptain: false,
                status: 'pending',
                submittedBy: submittedBy
            });
        }

        // Insert substitutes
        for (const playerId of input.substitutePlayerIds) {
            if (!playerId || !Number.isInteger(playerId)) {
                throw new Error(`Invalid playerId in substitutePlayerIds: ${playerId}`);
            }
            await upsertMatchLineup({
                matchId: input.matchId,
                seasonId: input.seasonId,
                seasonTeamId: input.seasonTeamId,
                playerId,
                isStarting: false,
                isCaptain: false,
                status: 'pending',
                submittedBy: submittedBy
            });
        }

        // Save Team Info (Formation & Kit) - always upsert on submit
        await upsertMatchTeamInfo({
            matchId: input.matchId,
            seasonTeamId: input.seasonTeamId,
            formation: input.formation || '4-4-2',
            kitType: input.kitType || 'HOME'
        });

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
    } catch (error: any) {
        console.error("[matchLineupService] Error in submitLineup:", error);
        console.error("[matchLineupService] Error details:", {
            message: error.message,
            code: error.code,
            number: error.number,
            state: error.state,
            class: error.class,
            serverName: error.serverName,
            procName: error.procName,
            lineNumber: error.lineNumber
        });
        
        // Return user-friendly error message
        if (error.message) {
            return { success: false, errors: [error.message] };
        }
        return { success: false, errors: ['Lỗi khi lưu đội hình. Vui lòng thử lại.'] };
    }
};

export const upsertMatchTeamInfo = async (info: {
    matchId: number;
    seasonTeamId: number;
    formation: string;
    kitType: string;
}): Promise<void> => {
    const checkSql = `SELECT info_id FROM match_team_infos WHERE match_id = @matchId AND season_team_id = @seasonTeamId`;
    const existing = await query(checkSql, { matchId: info.matchId, seasonTeamId: info.seasonTeamId });

    if (existing.recordset.length > 0) {
        await query(`
            UPDATE match_team_infos
            SET formation = @formation,
                kit_type = @kitType,
                updated_at = GETDATE()
            WHERE info_id = @id
        `, {
            id: existing.recordset[0].info_id,
            formation: info.formation,
            kitType: info.kitType
        });
    } else {
        await query(`
            INSERT INTO match_team_infos (match_id, season_team_id, formation, kit_type)
            VALUES (@matchId, @seasonTeamId, @formation, @kitType)
        `, {
            matchId: info.matchId,
            seasonTeamId: info.seasonTeamId,
            formation: info.formation,
            kitType: info.kitType
        });
    }
};

export const getMatchTeamInfo = async (matchId: number, seasonTeamId: number) => {
    const result = await query<{ formation: string; kitType: string }>(`
        SELECT formation, kit_type as kitType
        FROM match_team_infos
        WHERE match_id = @matchId AND season_team_id = @seasonTeamId
    `, { matchId, seasonTeamId });
    return result.recordset[0] || null;
};

/**
 * Auto generate lineup for a team if not exists (Super Admin only)
 * Selects first 11 players as starting, next 5 as substitutes
 */
export async function autoGenerateLineup(
    matchId: number,
    seasonTeamId: number,
    submittedBy: number
): Promise<{
    success: boolean;
    created: number;
    message: string;
}> {
    // Check if lineup already exists
    const existing = await query(
        `SELECT COUNT(*) as count FROM match_lineups 
         WHERE match_id = @matchId AND season_team_id = @seasonTeamId`,
        { matchId, seasonTeamId }
    );

    if (existing.recordset[0]?.count > 0) {
        return {
            success: false,
            created: 0,
            message: 'Đội hình đã tồn tại cho đội này'
        };
    }

    // Get match info
    const matchInfo = await query<{
        season_id: number;
        home_season_team_id: number;
        away_season_team_id: number;
    }>(
        `SELECT season_id, home_season_team_id, away_season_team_id 
         FROM matches WHERE match_id = @matchId`,
        { matchId }
    );

    if (!matchInfo.recordset[0]) {
        throw new Error('Match not found');
    }

    const seasonId = matchInfo.recordset[0].season_id;
    const teamType = matchInfo.recordset[0].home_season_team_id === seasonTeamId ? 'home' : 'away';

    // Get approved players for this team in this season
    const players = await query<{
        player_id: number;
        season_player_id: number;
        shirt_number: number;
        position_code: string;
    }>(
        `SELECT 
            spr.player_id,
            spr.season_player_id,
            spr.shirt_number,
            spr.position_code
         FROM season_player_registrations spr
         WHERE spr.season_id = @seasonId
           AND spr.season_team_id = @seasonTeamId
           AND spr.registration_status = 'approved'
         ORDER BY spr.shirt_number ASC, spr.player_id ASC`,
        { seasonId, seasonTeamId }
    );

    if (players.recordset.length < LINEUP_REQUIREMENTS.STARTING_PLAYERS) {
        return {
            success: false,
            created: 0,
            message: `Không đủ cầu thủ. Cần tối thiểu ${LINEUP_REQUIREMENTS.STARTING_PLAYERS} cầu thủ, hiện có ${players.recordset.length}`
        };
    }

    const playerList = players.recordset;
    const startingPlayers = playerList.slice(0, LINEUP_REQUIREMENTS.STARTING_PLAYERS);
    const substitutePlayers = playerList.slice(
        LINEUP_REQUIREMENTS.STARTING_PLAYERS,
        LINEUP_REQUIREMENTS.STARTING_PLAYERS + LINEUP_REQUIREMENTS.MAX_SUBSTITUTES
    );

    let created = 0;

    // Insert starting players
    for (const player of startingPlayers) {
        await upsertMatchLineup({
            matchId,
            seasonId,
            seasonTeamId,
            playerId: player.player_id,
            jerseyNumber: player.shirt_number,
            position: player.position_code || null,
            isStarting: true,
            isCaptain: false,
            status: 'approved',
            submittedBy
        });
        created++;
    }

    // Insert substitutes
    for (const player of substitutePlayers) {
        await upsertMatchLineup({
            matchId,
            seasonId,
            seasonTeamId,
            playerId: player.player_id,
            jerseyNumber: player.shirt_number,
            position: player.position_code || null,
            isStarting: false,
            isCaptain: false,
            status: 'approved',
            submittedBy
        });
        created++;
    }

    // Set team_type and approval_status
    await query(
        `UPDATE match_lineups
         SET team_type = @teamType,
             approval_status = 'APPROVED',
             submitted_at = GETDATE()
         WHERE match_id = @matchId
           AND season_team_id = @seasonTeamId`,
        { matchId, seasonTeamId, teamType }
    );

    // Set default formation and kit
    await upsertMatchTeamInfo({
        matchId,
        seasonTeamId,
        formation: '4-4-2',
        kitType: teamType === 'home' ? 'HOME' : 'AWAY'
    });

    return {
        success: true,
        created,
        message: `Đã tạo đội hình: ${startingPlayers.length} chính thức, ${substitutePlayers.length} dự bị`
    };
}