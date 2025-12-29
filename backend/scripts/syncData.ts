
import { syncAllData } from "../src/services/syncService";
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env vars
const dotenvPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: dotenvPath });

async function runSync() {
    console.log("🚀 Starting data synchronization...");

    // Default to syncing everything, or specifically focus on teams/players as requested
    // The user mentioned renaming teams, so we must sync teams and players.
    // Syncing matches is also good to ensure consistency.
    try {
        const result = await syncAllData({
            season: '2025', // Assuming current season or let it detect
            syncTeams: true,
            syncPlayers: true,
            syncMatches: true,
            syncStandings: true
        });

        if (result.success) {
            console.log("✅ Sync completed successfully!");
            console.log("Summary:", JSON.stringify(result.results, null, 2));
        } else {
            console.error("❌ Sync failed with errors:", result.errors);
            console.log("Partial results:", JSON.stringify(result.results, null, 2));
        }
    } catch (error) {
        console.error("❌ Unexpected error during sync:", error);
    }
}

runSync();
