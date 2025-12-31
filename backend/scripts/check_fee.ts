
import 'dotenv/config';
import { query } from "../src/db/sqlServer";

async function run() {
    try {
        const res = await query(`
            SELECT 
                t.name, 
                str.fee_status, 
                str.season_id,
                stp.season_team_id
            FROM teams t
            JOIN season_team_participants stp ON t.team_id = stp.team_id
            JOIN season_team_registrations str ON stp.team_id = str.team_id AND stp.season_id = str.season_id
            WHERE t.name LIKE '%HAGL%' OR t.name LIKE '%Hoàng Anh Gia Lai%'
        `);
        res.recordset.forEach(r => {
            console.log(`Team: ${r.name}, SeasonId: ${r.season_id}, SeasonTeamId: ${r.season_team_id}, FeeStatus: ${r.fee_status}`);
        });

        // Also check if they are in season_team_registrations at all
        if (res.recordset.length === 0) {
            console.log("No registration found in season_team_registrations");
            const stp = await query(`
                SELECT * FROM season_team_participants stp
                JOIN teams t ON stp.team_id = t.team_id
                WHERE t.name LIKE '%HAGL%' OR t.name LIKE '%Hoàng Anh Gia Lai%'
            `);
            console.log("SPT: ", stp.recordset);
        }

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
