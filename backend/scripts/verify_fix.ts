
import { listLocalPlayers } from "../src/services/playerService";
import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== VERIFY FIX ===");
    try {
        const teams = await query(`
            SELECT team_id, name 
            FROM teams 
            WHERE name LIKE N'%C%ng An%'
        `);

        if (teams.recordset.length > 0) {
            const teamId = teams.recordset[0].team_id;
            console.log(`Checking local players for team ${teamId} (${teams.recordset[0].name})...`);

            const players = await listLocalPlayers(teamId);
            console.log(`Found ${players.length} players via listLocalPlayers().`);

            if (players.length > 0) {
                console.log("Sample player:", players[0]);
            } else {
                console.log("ERROR: No players found!");
            }
        } else {
            console.log("Team not found for verification.");
        }

    } catch (err: any) {
        console.error("Error:", err.message);
        console.error(err);
    }
    process.exit(0);
}

run();
