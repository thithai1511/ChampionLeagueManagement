import { query } from "../src/db/sqlServer";

async function run() {
    try {
        console.log("=== APPROVING ALL PLAYER REGISTRATIONS ===\n");

        const result = await query(`
            UPDATE season_player_registrations
            SET registration_status = 'approved'
            WHERE season_id = 9
        `);

        console.log(`✅ Updated ${result.rowsAffected[0]} players to 'approved' status`);
        console.log("\nPlayers will now appear in UI!");

        process.exit(0);
    } catch (err: any) {
        console.error("Error:", err.message);
        process.exit(1);
    }
}

run();
