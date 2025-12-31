
import 'dotenv/config';
import { query } from "../src/db/sqlServer";

async function run() {
    try {
        console.log("Debug HAGL Data");
        const res = await query(`
            SELECT 
                t.name AS TeamName, 
                st.season_team_id, 
                st.season_id,
                COUNT(spr.season_player_id) AS PlayerCount
            FROM teams t
            JOIN season_team_participants st ON t.team_id = st.team_id
            LEFT JOIN season_player_registrations spr ON st.season_team_id = spr.season_team_id
            WHERE t.name LIKE '%Hoàng Anh Gia Lai%' OR t.name LIKE '%HAGL%'
            GROUP BY t.name, st.season_team_id, st.season_id
        `);
        console.log("Team Summary:");
        console.log(JSON.stringify(res.recordset, null, 2));

        if (res.recordset.length > 0) {
            // Pick the most recent one or all
            for (const row of res.recordset) {
                const teamId = row.season_team_id;
                console.log(`\nChecking players for SeasonTeamID: ${teamId} (Season ${row.season_id})`);
                const players = await query(`
                    SELECT p.name, spr.position_code, spr.shirt_number
                    FROM season_player_registrations spr
                    JOIN players p ON spr.player_id = p.player_id
                    WHERE spr.season_team_id = ${teamId}
                    ORDER BY spr.position_code
                 `);
                console.log(`Count: ${players.recordset.length}`);
                // console.log(JSON.stringify(players.recordset, null, 2));
            }
        } else {
            console.log("No HAGL team found in participants.");
        }

        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
