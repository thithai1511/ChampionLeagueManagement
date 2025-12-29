
import { query } from "../src/db/sqlServer";
import * as path from 'path';
import * as dotenv from 'dotenv';

const dotenvPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: dotenvPath });

async function distributePlayers() {
    try {
        console.log("🚀 Starting distribution of orphaned players...");

        // 1. Get List of Orphaned Players
        // Players whose team_external_id does not exist in FootballTeams
        const orphansResult = await query(`
            SELECT p.id, p.name 
            FROM dbo.FootballPlayers p
            LEFT JOIN dbo.FootballTeams t ON p.team_external_id = t.external_id
            WHERE t.id IS NULL AND p.team_external_id IS NOT NULL
        `);
        const orphanedPlayers = orphansResult.recordset as any[];
        console.log(`Found ${orphanedPlayers.length} orphaned players.`);

        if (orphanedPlayers.length === 0) {
            console.log("No orphaned players to distribute.");
            return;
        }

        // 2. Get List of Available Current Teams (Joined with internal teams table)
        // We Join on NAME to find the corresponding internal team_id for the FK
        const teamsResult = await query(`
            SELECT 
                ft.id as ft_id, 
                ft.external_id, 
                ft.name,
                t.team_id as internal_id
            FROM dbo.FootballTeams ft
            JOIN dbo.teams t ON ft.name = t.name
            ORDER BY ft.name
        `);
        const availableTeams = teamsResult.recordset as any[];
        console.log(`Found ${availableTeams.length} available teams (matched internal & external).`);

        if (availableTeams.length === 0) {
            console.error("No available matched teams to assign players to!");
            console.log("Tip: Ensure 'FootballTeams' and 'teams' tables have matching team names.");
            return;
        }

        // 3. Distribute Players Round-Robin
        console.log("Distributing players...");
        let updates = 0;

        for (let i = 0; i < orphanedPlayers.length; i++) {
            const player = orphanedPlayers[i];
            const targetTeam = availableTeams[i % availableTeams.length];

            // Use the correct internal_id from the teams table
            const internalId = targetTeam.internal_id;
            const newExternalId = targetTeam.external_id || null;

            await query(`
                UPDATE dbo.FootballPlayers
                SET 
                    internal_team_id = @internalId,
                    team_external_id = @externalId,
                    updated_at = GETDATE()
                WHERE id = @playerId
            `, {
                internalId: internalId,
                externalId: newExternalId,
                playerId: player.id
            });

            updates++;
            if (updates % 50 === 0) console.log(`Assigned first ${updates} players...`);
        }

        console.log(`\n✅ Successfully assigned ${updates} players to ${availableTeams.length} teams.`);

    } catch (err: any) {
        console.error("Error Message:", err.message);
        if (err.originalError) {
            console.error("Original SQL Error:", err.originalError.message);
        }
    }
}

distributePlayers();
