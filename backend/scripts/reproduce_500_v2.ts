
import { listPlayers } from "../src/services/playerService";

async function run() {
    console.log("=== REPRODUCE 500 ERROR V2 ===");
    try {
        const teamId = 44;
        console.log(`Calling listPlayers({ teamId: ${teamId} })...`);
        const synced = await listPlayers({ teamId, limit: 100 });
        console.log("Success! Players found:", synced.data.length);

        if (synced.data.length > 0) {
            console.log("First player:", synced.data[0]);
        }
    } catch (err: any) {
        console.log("Full Error Object:");
        console.log(err);
        console.log("---------------------------------------------------");
    }
    process.exit(0);
}

run();
