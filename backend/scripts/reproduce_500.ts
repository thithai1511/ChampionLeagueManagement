
import { listPlayers, listLocalPlayers } from "../src/services/playerService";
import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== REPRODUCE 500 ERROR ===");
    try {
        const teamId = 44; // From user logs
        // Mock season param as handled in controller often (could be undefined/null or "2023" etc)
        const season = undefined;

        console.log(`Calling listPlayers for team ${teamId}...`);
        const syncedPlayers = await listPlayers({
            teamId,
            season, // This matches what the controller passes if query param is missing
            limit: 100
        });
        console.log(`syncedPlayers count: ${syncedPlayers.data.length}`);

        console.log(`Calling listLocalPlayers for team ${teamId}...`);
        const localPlayers = await listLocalPlayers(teamId);
        console.log(`localPlayers count: ${localPlayers.length}`);

        const allPlayers = [...syncedPlayers.data, ...localPlayers];
        console.log(`Total merged players: ${allPlayers.length}`);

        // Output one form each to check structure compatibility
        if (syncedPlayers.data.length > 0) console.log("Synced Ex:", syncedPlayers.data[0]);
        if (localPlayers.length > 0) console.log("Local Ex:", localPlayers[0]);

    } catch (err: any) {
        console.error("CAUGHT ERROR:", err);
    }
    process.exit(0);
}

run();
