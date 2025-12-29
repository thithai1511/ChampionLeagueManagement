require('dotenv').config();
const sql = require('mssql');

const config = {
    server: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'ChampionLeagueManagement',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASS || 'thang2309',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

async function run() {
    let pool;

    try {
        console.log("Connecting to database...");
        pool = await sql.connect(config);
        console.log("Connected!\n");

        const seasonId = 9;

        // Clear lineup players first (FK constraint)
        console.log("Clearing lineup players...");
        await pool.request()
            .input('seasonId', sql.Int, seasonId)
            .query('DELETE FROM match_lineup_players WHERE season_id = @seasonId');
        console.log("Lineup players cleared");

        // Clear registrations
        console.log("Clearing registrations...");
        await pool.request()
            .input('seasonId', sql.Int, seasonId)
            .query('DELETE FROM season_player_registrations WHERE season_id = @seasonId');
        console.log("Cleared\n");

        // Get teams
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
        console.log(`Teams: ${teams.length}\n`);

        // Get players
        const playersResult = await pool.request()
            .query('SELECT TOP 374 id FROM FootballPlayers ORDER BY NEWID()');

        const players = playersResult.recordset;
        console.log(`Players: ${players.length}\n`);

        // Distribute
        let idx = 0;
        let total = 0;

        for (let i = 0; i < teams.length; i++) {
            const team = teams[i];
            process.stdout.write(`${i + 1}. ${team.name}... `);

            let count = 0;
            for (let j = 0; j < 22 && idx < players.length; j++) {
                try {
                    await pool.request()
                        .input('seasonId', sql.Int, seasonId)
                        .input('seasonTeamId', sql.Int, team.season_team_id)
                        .input('playerId', sql.Int, players[idx].id)
                        .input('playerType', sql.VarChar(32), 'domestic')
                        .input('age', sql.TinyInt, 25)
                        .input('status', sql.VarChar(32), 'approved')
                        .query(`
                            INSERT INTO season_player_registrations 
                            (season_id, season_team_id, player_id, player_type, age_on_season_start, registration_status) 
                            VALUES (@seasonId, @seasonTeamId, @playerId, @playerType, @age, @status)
                        `);

                    count++;
                    idx++;
                } catch (err) {
                    // Skip
                    idx++;
                }
            }

            total += count;
            console.log(`${count} players`);
        }

        console.log(`\n✅ Done! Total: ${total} players`);

        await pool.close();
        process.exit(0);

    } catch (err) {
        console.error("\n❌ Error:", err.message);
        if (pool) await pool.close();
        process.exit(1);
    }
}

run();
