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
        const matchId = 7747;

        // Get the match
        const matchResult = await pool.request()
            .input('matchId', sql.Int, matchId)
            .query(`
                SELECT 
                    m.match_id,
                    m.season_id,
                    m.home_season_team_id,
                    m.away_season_team_id,
                    ht.name as home_team,
                    at.name as away_team
                FROM matches m
                LEFT JOIN season_team_participants stp_home ON m.home_season_team_id = stp_home.season_team_id
                LEFT JOIN teams ht ON stp_home.team_id = ht.team_id
                LEFT JOIN season_team_participants stp_away ON m.away_season_team_id = stp_away.season_team_id
                LEFT JOIN teams at ON stp_away.team_id = at.team_id
                WHERE m.match_id = @matchId
            `);

        if (matchResult.recordset.length === 0) {
            console.log('❌ Match 7747 not found!');
            await pool.close();
            process.exit(1);
        }

        const match = matchResult.recordset[0];
        console.log('Match 7747 Info:');
        console.log(JSON.stringify(match, null, 2));
        console.log('');

        // Check players for home team
        if (match.home_season_team_id) {
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

            console.log(`✓ Home team (${match.home_team}) players: ${homePlayersResult.recordset[0].cnt}`);
        } else {
            console.log('❌ No home_season_team_id!');
        }

        // Check players for away team
        if (match.away_season_team_id) {
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

            console.log(`✓ Away team (${match.away_team}) players: ${awayPlayersResult.recordset[0].cnt}`);
        } else {
            console.log('❌ No away_season_team_id!');
        }

        await pool.close();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        await pool.close();
        process.exit(1);
    }
}

run();
