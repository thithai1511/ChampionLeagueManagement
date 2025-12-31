
import 'dotenv/config';
import { query } from "../src/db/sqlServer";

async function run() {
    try {
        await query("SELECT TOP 1 shirt_number FROM season_player_registrations");
        console.log("shirt_number exists");
    } catch (e: any) { console.log("shirt_number MISSING (" + e.message + ")"); }

    try {
        await query("SELECT TOP 1 position_code FROM season_player_registrations");
        console.log("position_code exists");
    } catch (e: any) { console.log("position_code MISSING (" + e.message + ")"); }

    process.exit(0);
}
run();
