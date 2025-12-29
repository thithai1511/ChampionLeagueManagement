import { query } from "../db/sqlServer";

export interface CreatePlayerDto {
    name: string;
    date_of_birth: string;
    nationality?: string;
    position?: string;
    internal_team_id?: number;
}

export interface Player {
    player_id: number;
    name: string;
    date_of_birth: string;
    nationality: string | null;
    position: string | null;
    created_at?: string;
}

/**
 * Create a new player in players table
 */
export const createPlayer = async (data: CreatePlayerDto): Promise<Player> => {
    const { name, date_of_birth, nationality, position, internal_team_id } = data;

    // Insert into players table (Single Source of Truth)
    const result = await query<{
        player_id: number;
        full_name: string;
        nationality: string;
        preferred_position: string;
        date_of_birth: string;
    }>(`
        INSERT INTO players (
            full_name,
            display_name,
            date_of_birth,
            nationality,
            preferred_position,
            current_team_id,
            created_at
        )
        OUTPUT 
            INSERTED.player_id, 
            INSERTED.full_name, 
            INSERTED.nationality, 
            INSERTED.preferred_position, 
            CONVERT(VARCHAR(10), INSERTED.date_of_birth, 23) as date_of_birth
        VALUES (
            @name,
            @name,
            @dob,
            @nationality,
            @position,
            @teamId,
            SYSUTCDATETIME()
        );
    `, {
        name: name.trim(),
        dob: date_of_birth,
        nationality: nationality ? nationality.trim() : 'Unknown',
        position: position ? position.trim() : null,
        teamId: internal_team_id ?? null
    });

    const newId = result.recordset[0]?.player_id;

    if (!newId) {
        throw new Error("Failed to create player");
    }

    return {
        player_id: newId,
        name: result.recordset[0].full_name,
        date_of_birth: result.recordset[0].date_of_birth,
        nationality: result.recordset[0].nationality,
        position: result.recordset[0].preferred_position
    };
};
