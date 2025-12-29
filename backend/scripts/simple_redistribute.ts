import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== SIMPLE EVEN REDISTRIBUTION ===\n");

    try {
        const seasonId = 9;

        // 1. Clear
        console.log("Step 1: Clearing...");
        await query(`DELETE FROM season_player_registrations WHERE season_id = ${seasonId}`);
        console.log("Done\n");

        // 2. Get teams
        console.log("Step 2: Getting teams...");
        const teams = await query(`
            SELECT stp.season_team_id, t.name
            FROM season_team_participants stp
            JOIN teams t ON stp.team_id = t.team_id
            WHERE stp.season_id = ${seasonId}
            ORDER BY t.name
        `);
        console.log(`Found ${teams.recordset.length} teams\n`);

        // 3. Get players
        console.log("Step 3: Getting players...");
        const players = await query(`
            SELECT TOP 374 id
            FROM FootballPlayers
            WHERE id IS NOT NULL
            ORDER BY NEWID()
        `);
        console.log(`Got ${players.recordset.length} players\n`);

        // 4. Distribute
        console.log("Step 4: Distributing...");
        let idx = 0;

        for (let i = 0; i < teams.recordset.length; i++) {
            const team = teams.recordset[i];
            console.log(`${i + 1}/${teams.recordset.length}: ${team.name}...`);

            // Give this team 22 players
            const teamPlayers = [];
            for (let j = 0; j < 22 && idx < players.recordset.length; j++) {
                teamPlayers.push(players.recordset[idx++].id);
            }

            // Batch insert
            if (teamPlayers.length > 0) {
                const values = teamPlayers.map(pid =>
                    `(${seasonId}, ${team.season_team_id}, ${pid}, 'domestic', 25, 'approved')`
                ).join(',');

                await query(`
                    INSERT INTO season_player_registrations 
                    (season_id, season_team_id, player_id, player_type, age_on_season_start, registration_status)
                    VALUES ${values}
                `);
                console.log(`  ✓ ${teamPlayers.length} players`);
            }
        }

        console.log(`\n✅ Done! Refresh UI to see players!`);
        process.exit(0);
    } catch (err) {
        console.error("\n❌", err.message);
        process.exit(1);
    }
}

run();
