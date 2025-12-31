
import 'dotenv/config';
import { query } from "../src/db/sqlServer";

async function run() {
    try {
        const res = await query(`SELECT TOP 1 * FROM season_player_registrations`);
        if (res.recordset.length > 0) {
            console.log("KEYS: " + Object.keys(res.recordset[0]).join(", "));
        } else {
            console.log("EMPTY TABLE");
            // use sys.columns if empty
            const res2 = await query(`SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('season_player_registrations')`);
            console.log("SYS KEYS: " + res2.recordset.map(r => r.name).join(", "));
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
