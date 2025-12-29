import sql from 'mssql';

const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'ChampionLeagueManagement',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    authentication: {
        type: 'default',
        options: {
            userName: process.env.DB_USER || 'sa',
            password: process.env.DB_PASSWORD || 'thang2309'
        }
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

async function run() {
    let pool: sql.ConnectionPool | null = null;

    try {
        console.log("=== REDISTRIBUTING PLAYERS (ROBUST VERSION) ===\n");

        // Connect
        pool = await sql.connect(config);
        console.log("✓ Connected to database\n");

        const seasonId = 9;

        // Step 1: Clear
        console.log("1. Clearing...");
        await pool.request()
            .input('seasonId', sql.Int, seasonId)
            .query('DELETE FROM season_player_registrations WHERE season_id = @seasonId');
        console.log("✓ Cleared\n");

        // Step 2: Get teams
        console.log("2. Getting teams...");
        const teamsResult = await pool.request()
            .input('seasonId', sql.Int, seasonId)
            .query(`
                SELECT stp.season_team_id, t.name
                FROM season_team_participants stp
                JOIN teams t ON stp.team_id = t.team_id
                WHERE stp.season_id = @seasonId
                ORDER BY t.name
            `);
        const teams = teamsResult.recordset;
        console.log(`✓ ${teams.length} teams\n`);

        // Step 3: Get players
        console.log("3. Getting 374 random players...");
        const playersResult = await pool.request()
            .query('SELECT TOP 374 id FROM FootballPlayers WHERE id IS NOT NULL ORDER BY NEWID()');
        const players = playersResult.recordset;
        console.log(`✓ ${players.length} players\n`);

        // Step 4: Insert in BATCHES
        console.log("4. Inserting (batch mode)...\n");
        let playerIdx = 0;
        let total = 0;

        for (let i = 0; i < teams.length; i++) {
            const team = teams[i];

            // Collect 22 players for this team
            const teamPlayerIds = [];
            for (let j = 0; j < 22 && playerIdx < players.length; j++) {
                teamPlayerIds.push(players[playerIdx++].id);
            }

            if (teamPlayerIds.length === 0) continue;

            // Build VALUES string for batch INSERT
            const valuesStr = teamPlayerIds.map((pid, idx) =>
                `(${seasonId}, ${team.season_team_id}, ${pid}, 'domestic', 25, 'approved')`
            ).join(',\n');

            // Single batch INSERT for this team
            await pool.request().query(`
                INSERT INTO season_player_registrations 
                (season_id, season_team_id, player_id, player_type, age_on_season_start, registration_status)
                VALUES ${valuesStr}
            `);

            total += teamPlayerIds.length;
            console.log(`${i + 1}/${teams.length}. ${team.name}: ${teamPlayerIds.length} players`);
        }

        console.log(`\n✅ Success! Total: ${total} players distributed`);
        console.log(`\nRefresh UI to see players!`);

        await pool.close();
        process.exit(0);

    } catch (err: any) {
        console.error("\n❌ ERROR:", err.message);
        if (pool) await pool.close();
        process.exit(1);
    }
}

run();
