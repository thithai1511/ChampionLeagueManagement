import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== REGISTERING PLAYERS FOR SEASON 2026 ===\n");

    try {
        // 1. Find season 2026
        console.log("1. Finding season 2026...");
        const season2026Res = await query<{ season_id: number, name: string }>(`
            SELECT season_id, name 
            FROM seasons 
            WHERE name LIKE '%2026%' OR code LIKE '%2026%' OR name LIKE '%25/26%' OR code LIKE '%2526%'
            ORDER BY season_id DESC
        `);

        if (season2026Res.recordset.length === 0) {
            console.log("❌ Season 2026 not found!");
            console.log("\nAvailable seasons:");
            const allSeasons = await query(`SELECT season_id, name, code FROM seasons ORDER BY season_id DESC`);
            allSeasons.recordset.forEach(s => console.log(`  - ${s.name} (${s.code})`));
            process.exit(1);
        }

        const season2026 = season2026Res.recordset[0];
        console.log(`✓ Found: ${season2026.name} (ID: ${season2026.season_id})\n`);

        // 2. Find season 24/25 (source)
        console.log("2. Finding season 24/25 as source...");
        const season2425Res = await query<{ season_id: number }>(`
            SELECT season_id FROM seasons WHERE code = 'VL2425'
        `);

        if (season2425Res.recordset.length === 0) {
            console.log("❌ Season 24/25 not found as source!");
            process.exit(1);
        }

        const season2425Id = season2425Res.recordset[0].season_id;
        console.log(`✓ Source season ID: ${season2425Id}\n`);

        // 3. Get teams in season 2026
        console.log("3. Getting teams in season 2026...");
        const teams2026 = await query<{ season_team_id: number, team_id: number, team_name: string }>(`
            SELECT 
                stp.season_team_id,
                stp.team_id,
                t.name as team_name
            FROM season_team_participants stp
            JOIN teams t ON stp.team_id = t.team_id
            WHERE stp.season_id = @seasonId
            ORDER BY t.name
        `, { seasonId: season2026.season_id });

        console.log(`✓ Found ${teams2026.recordset.length} teams:\n`);
        teams2026.recordset.forEach((t, idx) => {
            console.log(`   ${idx + 1}. ${t.team_name}`);
        });

        // 4. Register players
        console.log("\n4. Registering players...\n");
        let totalRegistered = 0;

        for (const team2026 of teams2026.recordset) {
            console.log(`Processing ${team2026.team_name}...`);

            // Get players from season 24/25 for this team
            const playersFrom2425 = await query<{ player_id: number, player_name: string }>(`
                SELECT DISTINCT 
                    spr.player_id,
                    fp.name as player_name
                FROM season_player_registrations spr
                JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
                JOIN FootballPlayers fp ON spr.player_id = fp.id
                WHERE spr.season_id = @season2425Id 
                  AND stp.team_id = @teamId
            `, {
                season2425Id,
                teamId: team2026.team_id
            });

            let teamCount = 0;
            for (const player of playersFrom2425.recordset) {
                try {
                    // Check if already registered
                    const existsRes = await query(`
                        SELECT season_player_id
                        FROM season_player_registrations
                        WHERE season_id = @seasonId
                          AND season_team_id = @seasonTeamId
                          AND player_id = @playerId
                    `, {
                        seasonId: season2026.season_id,
                        seasonTeamId: team2026.season_team_id,
                        playerId: player.player_id
                    });

                    if (existsRes.recordset.length > 0) {
                        continue; // Already registered
                    }

                    // Register player
                    await query(`
                        INSERT INTO season_player_registrations (
                            season_id,
                            season_team_id,
                            player_id,
                            status,
                            registration_fee_paid,
                            registered_by
                        ) VALUES (
                            @seasonId,
                            @seasonTeamId,
                            @playerId,
                            'active',
                            1,
                            1
                        )
                    `, {
                        seasonId: season2026.season_id,
                        seasonTeamId: team2026.season_team_id,
                        playerId: player.player_id
                    });

                    teamCount++;
                    totalRegistered++;
                } catch (err: any) {
                    // Ignore duplicate errors
                    if (!err.message.includes('duplicate') && !err.message.includes('UNIQUE')) {
                        console.log(`  ⚠ Failed to register ${player.player_name}: ${err.message.substring(0, 50)}`);
                    }
                }
            }

            console.log(`  ✓ Registered ${teamCount} players`);
        }

        // Summary
        console.log("\n=== SUCCESS ===");
        console.log(`Season: ${season2026.name}`);
        console.log(`Teams: ${teams2026.recordset.length}`);
        console.log(`Players registered: ${totalRegistered}`);
        console.log(`\n✅ All players registered for season 2026!`);
        console.log(`\n💡 Now you can set lineups for season 2026 matches`);

        process.exit(0);
    } catch (err: any) {
        console.error("\n❌ ERROR:", err.message);
        console.error(err);
        process.exit(1);
    }
}

run();
