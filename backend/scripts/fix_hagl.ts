
import 'dotenv/config';
import { query } from '../src/db/sqlServer';

async function fixHAGL() {
    try {
        console.log('--- Checking HAGL ---');

        // 1. Find HAGL team and season info
        const teamInfoFn = await query(`
            SELECT TOP 1 t.team_id, t.name, stp.season_team_id, stp.season_id
            FROM teams t
            JOIN season_team_participants stp ON t.team_id = stp.team_id
            JOIN seasons s ON stp.season_id = s.season_id
            WHERE (t.name LIKE '%Hoàng Anh Gia Lai%' OR t.name LIKE '%HAGL%' OR t.name LIKE '%Gia Lai%')
            AND s.status = 'in_progress'
            ORDER BY s.start_date DESC
        `);

        if (teamInfoFn.recordset.length === 0) {
            console.log('HAGL team not found in active season.');
            // Fallback to any season
            const teamInfoFn2 = await query(`
            SELECT TOP 1 t.team_id, t.name, stp.season_team_id, stp.season_id
            FROM teams t
            JOIN season_team_participants stp ON t.team_id = stp.team_id
            WHERE (t.name LIKE '%Hoàng Anh Gia Lai%' OR t.name LIKE '%HAGL%' OR t.name LIKE '%Gia Lai%')
            ORDER BY stp.season_id DESC
            `);
            if (teamInfoFn2.recordset.length === 0) {
                console.log('HAGL team not found at all.');
                process.exit(1);
            }
            console.log('Found HAGL in inactive season? Proceeding anyway.');
            teamInfoFn.recordset = teamInfoFn2.recordset;
        }

        const team = teamInfoFn.recordset[0];
        console.log(`Team: ${team.name} (ID: ${team.team_id})`);
        console.log(`Season: ${team.season_id}, SeasonTeamID: ${team.season_team_id}`);

        // 2. Check registered players
        const regRes = await query(`
            SELECT COUNT(*) as cnt FROM season_player_registrations 
            WHERE season_team_id = @sid
        `, { sid: team.season_team_id });
        const regCount = regRes.recordset[0].cnt;
        console.log(`Registered Players: ${regCount}`);

        if (regCount >= 18) {
            console.log('HAGL has enough players. Checking if they have positions/numbers...');
            const qualRes = await query(`
                SELECT COUNT(*) as cnt FROM season_player_registrations 
                WHERE season_team_id = @sid AND (shirt_number IS NULL OR position_code IS NULL)
            `, { sid: team.season_team_id });
            const badCount = qualRes.recordset[0].cnt;
            if (badCount > 0) {
                console.log(`Found ${badCount} players with missing shirt/position. Fixing...`);

                // Update missing details
                await query(`
                    UPDATE season_player_registrations
                    SET shirt_number = (ABS(CHECKSUM(NEWID())) % 99) + 1,
                        position_code = CASE WHEN (ABS(CHECKSUM(NEWID())) % 10) < 1 THEN 'GK' ELSE 'mf' END
                    WHERE season_team_id = @sid AND (shirt_number IS NULL OR position_code IS NULL)
                 `, { sid: team.season_team_id });
                console.log('Fixed missing details.');
            } else {
                console.log('All players seem valid.');
            }
            process.exit(0);
        }

        // 3. Register more players
        console.log('Registering players from roster...');
        // Get used shirt numbers
        const usedShirtsRes = await query(`SELECT shirt_number FROM season_player_registrations WHERE season_team_id = @stid`, { stid: team.season_team_id });
        const usedShirts = new Set(usedShirtsRes.recordset.map((r: any) => r.shirt_number));

        let nextShirt = 1;
        const getShirt = () => {
            while (usedShirts.has(nextShirt) || nextShirt > 99) nextShirt++;
            if (nextShirt > 99) nextShirt = 1; // loop back if full (unlikely for 22 players)
            usedShirts.add(nextShirt);
            return nextShirt;
        };

        // Find players in roster NOT in registration
        const rosterRes = await query(`
            SELECT p.player_id, p.full_name, p.preferred_position 
            FROM players p
            WHERE p.current_team_id = @tid
            AND NOT EXISTS (
                SELECT 1 FROM season_player_registrations spr 
                WHERE spr.player_id = p.player_id AND spr.season_id = @seasonId
            )
        `, { tid: team.team_id, seasonId: team.season_id });

        const available = rosterRes.recordset;
        console.log(`Found ${available.length} unregistered roster players.`);

        let added = 0;
        for (const p of available) {
            // Register them
            // Need shirt number and position
            const shirt = getShirt();
            await query(`
                INSERT INTO season_player_registrations (season_id, season_team_id, player_id, registration_status, shirt_number, position_code, player_type, is_foreign, age_on_season_start)
                VALUES (@seasonId, @stid, @pid, 'approved', 
                    @shirt, 
                    ISNULL(@pos, 'MF'),
                    'domestic', 0, 20
                )
             `, {
                seasonId: team.season_id,
                stid: team.season_team_id,
                pid: p.player_id,
                shirt: shirt,
                pos: p.preferred_position ? (p.preferred_position.length > 3 ? 'MF' : p.preferred_position) : 'MF'
            });
            added++;
        }
        console.log(`Registered ${added} existing players.`);

        // 4. If still not enough, create dummy players
        const currentTotal = regCount + added;
        if (currentTotal < 18) {
            const needed = 18 - currentTotal;
            console.log(`Still need ${needed} players. Creating dummies...`);

            for (let i = 0; i < needed; i++) {
                // Create player
                const name = `HAGL Player ${currentTotal + i + 1}`;
                const createRes = await query(`
                    INSERT INTO players (full_name, nationality, current_team_id)
                    OUTPUT INSERTED.player_id
                    VALUES (@name, 'Vietnam', @tid)
                 `, { name, tid: team.team_id });
                const pid = createRes.recordset[0].player_id;
                const shirt = getShirt();

                // Register
                await query(`
                    INSERT INTO season_player_registrations (season_id, season_team_id, player_id, registration_status, shirt_number, position_code, player_type, is_foreign, age_on_season_start)
                    VALUES (@seasonId, @stid, @pid, 'approved', 
                        @shirt, 
                        CASE WHEN @i < 2 THEN 'GK' ELSE 'MF' END,
                        'domestic', 0, 20
                    )
                 `, { seasonId: team.season_id, stid: team.season_team_id, pid, shirt, i });
            }
            console.log(`Created and registered ${needed} dummy players.`);
        }

        console.log('Fix complete.');
        process.exit(0);

    } catch (e) {
        console.error("FATAL ERROR:", e);
        process.exit(1);
    }
}

fixHAGL();
