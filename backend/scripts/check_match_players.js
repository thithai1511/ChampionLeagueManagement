require('dotenv').config();
const sql = require('mssql');

async function run() {
    const pool = await sql.connect({
        server: process.env.DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        options: { encrypt: true, trustServerCertificate: true }
    });

    try {
        // Get the match
        const matchResult = await pool.request().query(`
            SELECT TOP 1 
                m.match_id,
                m.season_id,
                m.home_season_team_id,
                m.away_season_team_id,
                ht.name as home_team,
                at.name as away_team
            FROM matches m
            JOIN season_team_participants stp_home ON m.home_season_team_id = stp_home.season_team_id
            JOIN teams ht ON stp_home.team_id = ht.team_id
            JOIN season_team_participants stp_away ON m.away_season_team_id = stp_away.season_team_id
            JOIN teams at ON stp_away.team_id = at.team_id
            WHERE ht.name LIKE '%Công An%' AND at.name LIKE '%Sông Lam%'
            ORDER BY m.match_id DESC
        `);

        const match = matchResult.recordset[0];
        console.log('Match Info:');
        console.log(JSON.stringify(match, null, 2));
        console.log('');

        // Check players for home team
        const homePlayersResult = await pool.request()
            .input('seasonId', sql.Int, match.season_id)
            .input('seasonTeamId', sql.Int, match.home_season_team_id)
            .query(`
                SELECT COUNT(*) as cnt
                FROM season_player_registrations
                WHERE season_id = @seasonId 
                  AND season_team_id = @seasonTeamId
                  AND registration_status = 'approved'
            `);

        console.log(`Home team (${match.home_team}) players: ${homePlayersResult.recordset[0].cnt}`);

        // Check players for away team
        const awayPlayersResult = await pool.request()
            .input('seasonId', sql.Int, match.season_id)
            .input('seasonTeamId', sql.Int, match.away_season_team_id)
            .query(`
                SELECT COUNT(*) as cnt
                FROM season_player_registrations
                WHERE season_id = @seasonId 
                  AND season_team_id = @seasonTeamId
                  AND registration_status = 'approved'
            `);

        console.log(`Away team (${match.away_team}) players: ${awayPlayersResult.recordset[0].cnt}`);

        await pool.close();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        await pool.close();
        process.exit(1);
    }
}

run();
