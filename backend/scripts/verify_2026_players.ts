import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== CHECKING SEASON 2026 PLAYER REGISTRATIONS ===\n");

    try {
        // 1. Find all seasons with "2026" or "25/26"
        const seasonsRes = await query(`
            SELECT season_id, name, code, status
            FROM seasons
            WHERE name LIKE '%2026%' OR name LIKE '%25/26%' OR code LIKE '%2526%' OR code LIKE '%2026%'
            ORDER BY season_id DESC
        `);

        console.log(`Found ${seasonsRes.recordset.length} season(s) matching 2026:\n`);
        seasonsRes.recordset.forEach(s => {
            console.log(`  - ID: ${s.season_id}, Name: "${s.name}", Code: "${s.code}", Status: ${s.status}`);
        });

        if (seasonsRes.recordset.length === 0) {
            console.log("\n❌ No season 2026 found!");
            console.log("\nAll seasons:");
            const allSeasons = await query(`SELECT season_id, name, code FROM seasons ORDER BY season_id DESC`);
            allSeasons.recordset.forEach(s => console.log(`  - ${s.name} (${s.code})`));
            process.exit(1);
        }

        // 2. Check each season for players
        for (const season of seasonsRes.recordset) {
            console.log(`\n--- Checking season: ${season.name} (ID: ${season.season_id}) ---`);

            // Count teams
            const teamsCount = await query(`
                SELECT COUNT(*) as cnt FROM season_team_participants WHERE season_id = @seasonId
            `, { seasonId: season.season_id });
            console.log(`Teams: ${teamsCount.recordset[0].cnt}`);

            // Count player registrations
            const playersCount = await query(`
                SELECT COUNT(*) as cnt FROM season_player_registrations WHERE season_id = @seasonId
            `, { seasonId: season.season_id });
            console.log(`Players registered: ${playersCount.recordset[0].cnt}`);

            // Sample players
            if (playersCount.recordset[0].cnt > 0) {
                const samplePlayers = await query(`
                    SELECT TOP 5
                        fp.name,
                        t.name as team_name
                    FROM season_player_registrations spr
                    JOIN FootballPlayers fp ON spr.player_id = fp.id
                    JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
                    JOIN teams t ON stp.team_id = t.team_id
                    WHERE spr.season_id = @seasonId
                `, { seasonId: season.season_id });

                console.log("\nSample players:");
                samplePlayers.recordset.forEach(p => {
                    console.log(`  - ${p.name} (${p.team_name})`);
                });
            }
        }

        // 3. Check what the UI might be looking for
        console.log("\n=== UI FILTER CHECK ===");
        console.log("The UI is filtering by: 'Mùa giải 2026 (2026)'");
        console.log("\nThis likely maps to season with:");
        console.log("  - name containing '2026'");
        console.log("  - OR code = '2026'");

        process.exit(0);
    } catch (err: any) {
        console.error("Error:", err.message);
        process.exit(1);
    }
}

run();
