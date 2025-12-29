import sql from 'mssql';

async function run() {
    const pool = await sql.connect({
        server: 'localhost',
        database: 'ChampionLeagueManagement',
        user: 'sa',
        password: 'thang2309',
        options: { encrypt: false, trustServerCertificate: true }
    });

    try {
        console.log("Starting...\n");
        const seasonId = 9;

        // Clear
        await pool.query`DELETE FROM season_player_registrations WHERE season_id = ${seasonId}`;
        console.log("Cleared\n");

        // Get teams
        const teams = await pool.query`
            SELECT stp.season_team_id as id, t.name
            FROM season_team_participants stp
            JOIN teams t ON stp.team_id = t.team_id
            WHERE stp.season_id = ${seasonId}
            ORDER BY t.name
        `;

        // Get players
        const players = await pool.query`SELECT TOP 374 id FROM FootballPlayers ORDER BY NEWID()`;

        console.log(`Teams: ${teams.recordset.length}, Players: ${players.recordset.length}\n`);

        // Distribute
        let idx = 0;
        for (let i = 0; i < teams.recordset.length; i++) {
            const team = teams.recordset[i];
            let count = 0;

            // Insert 22 players ONE BY ONE
            for (let j = 0; j < 22 && idx < players.recordset.length; j++) {
                const pid = players.recordset[idx++].id;

                await pool.query`
                    INSERT INTO season_player_registrations 
                    (season_id, season_team_id, player_id, player_type, age_on_season_start, registration_status)
                    VALUES (${seasonId}, ${team.id}, ${pid}, 'domestic', 25, 'approved')
                `;
                count++;
            }

            console.log(`${i + 1}. ${team.name}: ${count}`);
        }

        console.log("\n✅ Done!");
        await pool.close();
        process.exit(0);

    } catch (err) {
        console.error("Error:", err.message);
        await pool.close();
        process.exit(1);
    }
}

run();
