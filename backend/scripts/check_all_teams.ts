
import 'dotenv/config';
import { query } from "../src/db/sqlServer";

async function run() {
    try {
        console.log("Checking data integrity for ALL teams...");

        const problems = await query(`
            SELECT 
                t.team_id,
                t.name as team_name,
                COUNT(p.player_id) as total_players,
                SUM(CASE WHEN p.nationality IS NULL OR p.nationality NOT IN ('Vietnam', 'Việt Nam', 'VN') THEN 1 ELSE 0 END) as potential_missing_nationality,
                SUM(CASE WHEN spr.shirt_number IS NULL THEN 1 ELSE 0 END) as missing_shirt_number,
                SUM(CASE WHEN spr.position_code IS NULL THEN 1 ELSE 0 END) as missing_position
            FROM teams t
            JOIN season_team_participants stp ON t.team_id = stp.team_id
            JOIN season_player_registrations spr ON stp.season_team_id = spr.season_team_id
            JOIN players p ON spr.player_id = p.player_id
            GROUP BY t.team_id, t.name
            HAVING 
                SUM(CASE WHEN p.nationality IS NULL OR p.nationality NOT IN ('Vietnam', 'Việt Nam', 'VN') THEN 1 ELSE 0 END) > 0
                OR SUM(CASE WHEN spr.shirt_number IS NULL THEN 1 ELSE 0 END) > 0
                OR SUM(CASE WHEN spr.position_code IS NULL THEN 1 ELSE 0 END) > 0
            ORDER BY t.name
        `);

        if (problems.recordset.length === 0) {
            console.log("✅ All teams look good! No significant data issues found.");
        } else {
            console.log(`⚠️ Found ${problems.recordset.length} teams with issues:`);
            console.table(problems.recordset);
        }

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
