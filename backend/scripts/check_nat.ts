
import 'dotenv/config';
import { query } from "../src/db/sqlServer";

async function run() {
    try {
        const res = await query(`
            SELECT p.full_name, p.nationality
            FROM players p
            JOIN season_player_registrations spr ON p.player_id = spr.player_id
            JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
            JOIN teams t ON stp.team_id = t.team_id
            WHERE t.name LIKE '%HAGL%' OR t.name LIKE '%Hoàng Anh Gia Lai%'
        `);

        let foreignCount = 0;
        const foreign: any[] = [];
        res.recordset.forEach((p: any) => {
            const nat = p.nationality;
            const isForeign = !nat || !['Vietnam', 'Việt Nam', 'VN'].includes(nat);
            if (isForeign) {
                foreignCount++;
                foreign.push(p);
            }
        });

        console.log(`Total players: ${res.recordset.length}`);
        console.log(`Foreign/Null players: ${foreignCount}`);
        if (foreignCount > 0) {
            console.log("Foreign players:", JSON.stringify(foreign, null, 2));
        }

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
