
import 'dotenv/config';
import { query } from "../src/db/sqlServer";

async function run() {
    try {
        const res = await query(`
            SELECT 
                t.name AS TeamName, 
                st.season_team_id, 
                st.season_id,
                COUNT(spr.season_player_id) AS PlayerCount
            FROM teams t
            JOIN season_team_participants st ON t.team_id = st.team_id
            LEFT JOIN season_player_registrations spr ON st.season_team_id = spr.season_team_id
            WHERE t.name LIKE '%Hoàng Anh Gia Lai%' OR t.name LIKE '%Gia Lai%'
            GROUP BY t.name, st.season_team_id, st.season_id
        `);
        // Just print the count
        if (res.recordset.length > 0) {
            console.log("PLAYER_COUNT=" + res.recordset[0].PlayerCount);
            console.log("TEAM_NAME=" + res.recordset[0].TeamName);
            console.log("SEASON_TEAM_ID=" + res.recordset[0].season_team_id);
        } else {
            console.log("TEAM_NOT_FOUND");
        }
        process.exit(0);
    } catch (e) {
        console.log("ERROR");
        process.exit(1);
    }
}
run();
