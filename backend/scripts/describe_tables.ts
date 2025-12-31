
import 'dotenv/config';
import { query } from "../src/db/sqlServer";

async function run() {
    try {
        const res = await query(`sp_help 'players'`);
        const res2 = await query(`sp_help 'season_player_registrations'`);

        console.log("PLAYERS COLUMNS:");
        if (res.recordsets.length > 1) {
            console.table(res.recordsets[1]); // usually columns are in 2nd resultset
        } else {
            console.log(JSON.stringify(res.recordset));
        }

        console.log("REGISTRATIONS COLUMNS:");
        if (res2.recordsets.length > 1) {
            console.table(res2.recordsets[1]);
        }
        process.exit(0);
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
}
run();
