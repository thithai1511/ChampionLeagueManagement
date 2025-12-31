
import 'dotenv/config';
import { query } from "../src/db/sqlServer";

async function run() {
    try {
        console.log("Fixing HAGL data...");
        // 1. Get Team
        const teamRes = await query(`
            SELECT TOP 1 * FROM season_team_participants stp
            JOIN teams t ON stp.team_id = t.team_id
            WHERE t.name LIKE '%HAGL%' OR t.name LIKE '%Hoàng Anh Gia Lai%'
        `);

        if (teamRes.recordset.length === 0) {
            console.log("HAGL not found");
            return;
        }

        const team = teamRes.recordset[0];
        console.log(`Found HAGL: ID=${team.team_id}, SeasonTeamID=${team.season_team_id}`);

        // 2. Fix Nationality
        // Set NULL to Vietnam for ALL registered players of this team
        const updateNat = await query(`
            UPDATE p
            SET p.nationality = 'Vietnam'
            FROM players p
            JOIN season_player_registrations spr ON p.player_id = spr.player_id
            WHERE spr.season_team_id = @stid
            AND (p.nationality IS NULL OR p.nationality NOT IN ('Vietnam', 'Việt Nam', 'VN'))
        `, { stid: team.season_team_id });
        console.log(`Updated nationality for ${updateNat.rowsAffected[0]} registered players.`);

        // 3. Fix Position Code in Registration
        const updatePos = await query(`
            UPDATE season_player_registrations
            SET position_code = 'MF'
            WHERE season_team_id = @stid
            AND (position_code IS NULL OR position_code = '')
        `, { stid: team.season_team_id });
        console.log(`Updated position_code for ${updatePos.rowsAffected[0]} registrations.`);

        // 4. Ensure shirt_number is not null
        const nullShirts = await query(`
            SELECT spr.season_player_id 
            FROM season_player_registrations spr
            WHERE spr.season_team_id = @stid AND spr.shirt_number IS NULL
        `, { stid: team.season_team_id });

        if (nullShirts.recordset.length > 0) {
            console.log(`Found ${nullShirts.recordset.length} players with NULL shirt_number. Fixing...`);

            // Get used shirts
            const usedRes = await query(`SELECT shirt_number FROM season_player_registrations WHERE season_team_id = @stid AND shirt_number IS NOT NULL`, { stid: team.season_team_id });
            const used = new Set(usedRes.recordset.map((r: any) => r.shirt_number));

            let nextShirt = 1;
            const getShirt = () => {
                while (used.has(nextShirt) || nextShirt > 99) nextShirt++;
                if (nextShirt > 99) nextShirt = 1;
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
            console.log("Fixed all NULL shirt numbers.");
        } else {
            console.log("All players have shirt numbers.");
        }

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
