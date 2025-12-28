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
 * Create a new player in FootballPlayers table
 */
export const createPlayer = async (data: CreatePlayerDto): Promise<Player> => {
    const { name, date_of_birth, nationality, position, internal_team_id } = data;

    // Insert into FootballPlayers (Single Source)
    const result = await query<{
        id: number;
        name: string;
        nationality: string;
        position: string;
        date_of_birth: string;
    }>(`
        INSERT INTO dbo.FootballPlayers (
            name,
            date_of_birth,
            nationality,
            position,
            internal_team_id,
            is_manual,
            external_key,
            updated_at
        )
        OUTPUT 
            INSERTED.id, 
            INSERTED.name, 
            INSERTED.nationality, 
            INSERTED.position, 
            CONVERT(VARCHAR(10), INSERTED.date_of_birth, 23) as date_of_birth
        VALUES (
            @name,
            @dob,
            @nationality,
            @position,
            @teamId,
            1, -- is_manual
            'MANUAL:' + CAST(NEWID() AS VARCHAR(50)),
            GETDATE()
        );
    `, {
        name: name.trim(),
        dob: date_of_birth,
        nationality: nationality ? nationality.trim() : 'Unknown',
        position: position ? position.trim() : null,
        teamId: internal_team_id ?? null
    });

    const newId = result.recordset[0]?.id;

    if (!newId) {
        throw new Error("Failed to create player");
    }

    return {
        player_id: newId,
        name: result.recordset[0].name,
        date_of_birth: result.recordset[0].date_of_birth,
        nationality: result.recordset[0].nationality,
        position: result.recordset[0].position
    };
};
