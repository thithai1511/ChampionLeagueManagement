require('dotenv').config();
const sql = require('mssql');

async function run() {
    console.error("Auto-saving lineup for Match 7747... (CORRECTED)");

    const pool = await sql.connect({
        server: process.env.DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        options: { encrypt: true, trustServerCertificate: true }
    });

    try {
        const matchId = 7747;

        // Ensure is_substitute column exists
        try {
            await pool.request().query("ALTER TABLE match_lineup_players ADD is_substitute BIT DEFAULT 0");
            console.error("✅ Added column is_substitute.");
        } catch (e) { /* ignore */ }

        // Get Match Info
        const matchRes = await pool.request()
            .input('matchId', sql.Int, matchId)
            .query(`SELECT home_season_team_id, away_season_team_id, season_id FROM matches WHERE match_id = @matchId`);

        if (matchRes.recordset.length === 0) throw new Error("Match not found");
        const { home_season_team_id, away_season_team_id, season_id: seasonId } = matchRes.recordset[0];

        console.error(`DEBUG: SeasonID=${seasonId}`);

        async function createTeamLineup(seasonTeamId, type) {
            console.error(`Processing ${type} team (ID: ${seasonTeamId})...`);

            // Get players
            const playersRes = await pool.request()
                .input('seasonTeamId', sql.Int, seasonTeamId)
                .query(`
                    SELECT season_player_id 
                    FROM season_player_registrations 
                    WHERE season_team_id = @seasonTeamId AND registration_status = 'approved'
                `);

            const players = playersRes.recordset;
            if (players.length < 16) return;

            // Shuffle
            players.sort(() => 0.5 - Math.random());
            const starters = players.slice(0, 11);
            const subs = players.slice(11, 16);

            // Create/Clear Lineup
            const existing = await pool.request()
                .input('matchId', sql.Int, matchId)
                .input('seasonTeamId', sql.Int, seasonTeamId)
                .query(`SELECT lineup_id FROM match_lineups WHERE match_id = @matchId AND season_team_id = @seasonTeamId`);

            let lineupId;
            if (existing.recordset.length > 0) {
                lineupId = existing.recordset[0].lineup_id;
                await pool.request().input('lineupId', sql.Int, lineupId).query(`DELETE FROM match_lineup_players WHERE lineup_id = @lineupId`);
            } else {
                const insertRes = await pool.request()
                    .input('matchId', sql.Int, matchId)
                    .input('seasonId', sql.Int, seasonId)
                    .input('seasonTeamId', sql.Int, seasonTeamId)
                    .query(`
                        INSERT INTO match_lineups (match_id, season_id, season_team_id, formation, submitted_at, status)
                        OUTPUT inserted.lineup_id
                        VALUES (@matchId, @seasonId, @seasonTeamId, '4-4-2', GETDATE(), 'submitted')
                    `);
                lineupId = insertRes.recordset[0].lineup_id;
            }

            function getUniqueNumbers(count) {
                const nums = Array.from({ length: 99 }, (_, i) => i + 1);
                nums.sort(() => 0.5 - Math.random());
                return nums.slice(0, count);
            }
            const shirtNums = getUniqueNumbers(16);

            // Insert Starters (Identity column lineup_player_id handled by DB)
            for (let i = 0; i < starters.length; i++) {
                await pool.request()
                    .input('lineupId', sql.Int, lineupId)
                    .input('seasonId', sql.Int, seasonId)
                    .input('seasonPlayerId', sql.Int, starters[i].season_player_id)
                    .input('roleCode', sql.VarChar, 'STARTER')
                    .input('positionCode', sql.VarChar, 'GENERIC')
                    .input('shirtNumber', sql.Int, shirtNums[i])
                    .input('isCaptain', sql.Bit, i === 0 ? 1 : 0)
                    .input('orderNumber', sql.Int, i + 1)
                    .input('isSubstitute', sql.Bit, 0)
                    .query(`
                        INSERT INTO match_lineup_players (
                            lineup_id, season_id, season_player_id, 
                            role_code, position_code, shirt_number, 
                            is_captain, order_number, is_substitute
                        )
                        VALUES (
                            @lineupId, @seasonId, @seasonPlayerId, 
                            @roleCode, @positionCode, @shirtNumber, 
                            @isCaptain, @orderNumber, @isSubstitute
                        )
                    `);
            }

            // Insert Subs
            for (let i = 0; i < subs.length; i++) {
                await pool.request()
                    .input('lineupId', sql.Int, lineupId)
                    .input('seasonId', sql.Int, seasonId)
                    .input('seasonPlayerId', sql.Int, subs[i].season_player_id)
                    .input('roleCode', sql.VarChar, 'SUBSTITUTE')
                    .input('positionCode', sql.VarChar, 'SUB')
                    .input('shirtNumber', sql.Int, shirtNums[11 + i])
                    .input('isCaptain', sql.Bit, 0)
                    .input('orderNumber', sql.Int, 11 + i + 1)
                    .input('isSubstitute', sql.Bit, 1)
                    .query(`
                        INSERT INTO match_lineup_players (
                            lineup_id, season_id, season_player_id, 
                            role_code, position_code, shirt_number, 
                            is_captain, order_number, is_substitute
                        )
                        VALUES (
                            @lineupId, @seasonId, @seasonPlayerId, 
                            @roleCode, @positionCode, @shirtNumber, 
                            @isCaptain, @orderNumber, @isSubstitute
                        )
                    `);
            }

            console.error(`✓ Saved lineup for ${type} team (Lineup ID: ${lineupId})`);
        }

        await createTeamLineup(home_season_team_id, 'HOME');
        await createTeamLineup(away_season_team_id, 'AWAY');

        console.error("\n✅ ALL DONE! Refresh page to see lineups.");

        await pool.close();
        process.exit(0);

    } catch (err) {
        console.error('ERROR:', err.message);
        await pool.close();
        process.exit(1);
    }
}

run();
