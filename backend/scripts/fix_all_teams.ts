
import 'dotenv/config';
import { query } from "../src/db/sqlServer";

async function run() {
    try {
        console.log("Starting bulk fix for ALL teams...");

        // 1. Fix Nationality (Global fix for registered players)
        // Set NULL/Invalid to Vietnam
        const updateNat = await query(`
            UPDATE p
            SET p.nationality = 'Vietnam'
            FROM players p
            JOIN season_player_registrations spr ON p.player_id = spr.player_id
            WHERE p.nationality IS NULL OR p.nationality NOT IN ('Vietnam', 'Việt Nam', 'VN')
        `);
        console.log(`Global Fix: Updated nationality for ${updateNat.rowsAffected[0]} players.`);

        // 2. Fix Position Code (Global fix)
        const updatePos = await query(`
            UPDATE season_player_registrations
            SET position_code = 'MF'
            WHERE position_code IS NULL OR position_code = ''
        `);
        console.log(`Global Fix: Updated position_code for ${updatePos.rowsAffected[0]} registrations.`);

        // 3. Fix Shirt Numbers (Per Team)
        // Find teams that have NULL shirt numbers
        const teamsWithIssues = await query(`
            SELECT DISTINCT season_team_id 
            FROM season_player_registrations 
            WHERE shirt_number IS NULL
        `);

        if (teamsWithIssues.recordset.length > 0) {
            console.log(`Found ${teamsWithIssues.recordset.length} teams with missing shirt numbers. Fixing individually...`);

            for (const team of teamsWithIssues.recordset) {
                const stid = team.season_team_id;

                // Get used shirts for this team
                const usedRes = await query(`SELECT shirt_number FROM season_player_registrations WHERE season_team_id = @stid AND shirt_number IS NOT NULL`, { stid });
                const used = new Set(usedRes.recordset.map((r: any) => r.shirt_number));

                // Get players needing shirts
                const nullShirts = await query(`
                    SELECT season_player_id 
                    FROM season_player_registrations 
                    WHERE season_team_id = @stid AND shirt_number IS NULL
                `, { stid });

                let nextShirt = 1;
                const getShirt = () => {
                    while (used.has(nextShirt) || nextShirt > 99) nextShirt++;
                    if (nextShirt > 99) nextShirt = 1; // wrapping
                    used.add(nextShirt);
                    return nextShirt;
                };

                for (const row of nullShirts.recordset) {
                    const newShirt = getShirt();
                    await query(`UPDATE season_player_registrations SET shirt_number = @shirt WHERE season_player_id = @spid`, {
                        shirt: newShirt,
                        spid: row.season_player_id
                    });
                }
                process.stdout.write(`.`); // Progress indicator
            }
            console.log("\nFixed shirt numbers for all affected teams.");
        } else {
            console.log("No missing shirt numbers found.");
        }

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
