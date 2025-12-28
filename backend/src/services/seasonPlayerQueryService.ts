import { query } from "../db/sqlServer";

export interface SeasonPlayerQueryFilters {
    team_id?: number;
    position_code?: string;
    nationality_type?: 'foreign' | 'domestic';
}

export interface SeasonPlayerDto {
    season_player_id?: number; // Added
    season_id: number;
    player_id: number;
    player_name: string;
    date_of_birth: Date | null;
    position_code: string;
    shirt_number: number;
    player_type: string;
    team_id: number;
    team_name: string;
    team_logo_url: string | null;
    file_path: string;
    registered_at: Date;
}

export interface SeasonTeamDto {
    team_id: number;
    team_name: string;
    season_team_id: number;
    logo_url: string | null;
}

// ... existing code ...

/**
 * Returns a list of players registered for a specific season.
 */
/**
 * Returns a list of players registered for a specific season.
 * Core query function with flexible filters.
 */
export async function getSeasonPlayers(
    seasonId: number,
    filters: SeasonPlayerQueryFilters = {}
): Promise<SeasonPlayerDto[]> {

    const { team_id, position_code, nationality_type } = filters;

    let sqlQuery = `
        SELECT 
            spr.season_player_id, -- Required for Remove action
            spr.season_id,
            spr.player_id,
            p.name AS player_name,
            p.date_of_birth,
            p.position AS detailed_position, -- Source of Truth
            spr.position_code, -- Functional Group
            spr.shirt_number,
            spr.player_type,
            stp.team_id,
            t.name AS team_name,
            t.logo_url AS team_logo_url,
            spr.file_path,
            spr.registered_at
        FROM season_player_registrations spr
        JOIN FootballPlayers p ON spr.player_id = p.id
        JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
        JOIN teams t ON stp.team_id = t.team_id
        WHERE spr.season_id = @season_id
          AND spr.registration_status = 'approved'
    `;

    const params: Record<string, unknown> = {
        season_id: seasonId
    };

    if (team_id) {
        sqlQuery += " AND stp.team_id = @team_id";
        params.team_id = team_id;
    }

    if (position_code) {
        // Filter by FUNCTIONAL GROUP (spr.position_code)
        sqlQuery += " AND spr.position_code = @position_code";
        params.position_code = position_code;
    }

    if (nationality_type) {
        sqlQuery += " AND spr.player_type = @nationality_type";
        params.nationality_type = nationality_type.toLowerCase();
    }

    sqlQuery += " ORDER BY t.name ASC, spr.shirt_number ASC";

    const result = await query<SeasonPlayerDto>(sqlQuery, params);
    return result.recordset;
}

/**
 * Service for Super Admin to see all approved players in a season
 */
export async function getApprovedSeasonPlayersForSuperAdmin(
    seasonId: number
): Promise<SeasonPlayerDto[]> {
    return getSeasonPlayers(seasonId);
}

/**
 * Service for Admin Team to see their own approved players in a season
 */
export async function getApprovedSeasonPlayersForAdminTeam(
    seasonId: number,
    teamIds: number[]
): Promise<SeasonPlayerDto[]> {
    if (teamIds.length === 0) {
        return [];
    }

    // Since getSeasonPlayers currently only supports single team_id filter, 
    // we can either update getSeasonPlayers to support IN, or just filter in memory or fetch per team.
    // Given the UI usually filters by one team at a time or we show all for the permitted teams.
    // Requirement says: "Có filter: season_id, team_id"
    // If user provides specific team_id, we check if it's in their list.
    // If not, we might need to fetch for all their teams.
    // IMPORTANT: The SQL query below needs to handle multiple teams if we want to show all "my teams".

    // Let's modify the query helper slightly or just loop?
    // Actually, let's create a specific query for this to be efficient with IN clause if team_id not provided.
    // BUT user requirement says "Có filter: team_id (nếu admin quản lý nhiều đội)".
    // So usually they pick one. If they don't, we show all their teams.

    // I will stick to reusing the SQL pattern but support list of teams.

    let sqlQuery = `
        SELECT 
            spr.season_player_id,
            spr.season_id,
            spr.player_id,
            p.name AS player_name,
            p.date_of_birth,
            spr.position_code,
            spr.shirt_number,
            spr.player_type,
            stp.team_id,
            t.name AS team_name,
            t.logo_url AS team_logo_url,
            spr.file_path,
            spr.registered_at
        FROM season_player_registrations spr
        JOIN FootballPlayers p ON spr.player_id = p.id
        JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
        JOIN teams t ON stp.team_id = t.team_id
        WHERE spr.season_id = @season_id
          AND spr.registration_status = 'approved'
          AND stp.team_id IN (${teamIds.join(',')})
    `;

    const params: Record<string, unknown> = {
        season_id: seasonId
    };

    sqlQuery += " ORDER BY t.name ASC, spr.shirt_number ASC";

    const result = await query<SeasonPlayerDto>(sqlQuery, params);
    return result.recordset;
}


/**
 * Returns a list of teams participating in a specific season.
 */
export async function getSeasonTeams(seasonId: number): Promise<SeasonTeamDto[]> {
    const sqlQuery = `
        SELECT 
            t.team_id,
            t.name AS team_name,
            t.logo_url,
            stp.season_team_id
        FROM season_team_participants stp
        JOIN teams t ON stp.team_id = t.team_id
        WHERE stp.season_id = @season_id
        ORDER BY t.name ASC
    `;

    const result = await query<SeasonTeamDto>(sqlQuery, { season_id: seasonId });
    return result.recordset;
}
