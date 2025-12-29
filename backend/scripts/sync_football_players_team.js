require('dotenv').config();
const sql = require('mssql');

async function run() {
    console.log("Syncing FootballPlayers internal_team_id with Season 2026 registrations...");

    const pool = await sql.connect({
        server: process.env.DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        options: { encrypt: true, trustServerCertificate: true }
    });

    try {
        const seasonId = 9; // V-League 2026

        // 1. Reset all internal_team_id first (clean slate) - Optional but safer? 
        // No, keep existing history if any, just overwrite for current season players.

        // 2. Update internal_team_id based on registrations
        // Note: FootballPlayers uses 'internal_team_id' which references 'teams(team_id)'

        const result = await pool.request()
            .input('seasonId', sql.Int, seasonId)
            .query(`
                UPDATE fp
                SET fp.internal_team_id = t.team_id
                FROM FootballPlayers fp
                JOIN season_player_registrations spr ON fp.id = spr.player_id
                JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
                JOIN teams t ON stp.team_id = t.team_id
                WHERE spr.season_id = @seasonId
            `);

        console.log(`✅ Updated ${result.rowsAffected[0]} players in FootballPlayers table.`);

        // Verify
        const verify = await pool.request().query(`
            SELECT COUNT(*) as cnt FROM FootballPlayers WHERE internal_team_id IS NOT NULL
        `);
        console.log(`Total players with assigned team: ${verify.recordset[0].cnt}`);

        await pool.close();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        await pool.close();
        process.exit(1);
    }
}

run();
