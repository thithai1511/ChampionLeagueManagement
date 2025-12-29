import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== CLEANING UP & REGISTERING PLAYERS ===\n");

    try {
        // 1. Get V-League season
        const seasonRes = await query<{ season_id: number }>(`SELECT season_id FROM seasons WHERE code = 'VL2425'`);
        if (seasonRes.recordset.length === 0) {
            console.log("❌ V-League 24/25 season not found!");
            process.exit(1);
        }
        const seasonId = seasonRes.recordset[0].season_id;
        console.log(`✓ Season ID: ${seasonId}\n`);

        // 2. Get V-League teams with season_team_ids
        const vleagueTeamsRes = await query(`
            SELECT 
                stp.season_team_id,
                stp.team_id,
                t.name
            FROM season_team_participants stp
            JOIN teams t ON stp.team_id = t.team_id
            WHERE stp.season_id = @seasonId
        `, { seasonId });

        console.log(`Found ${vleagueTeamsRes.recordset.length} V-League teams\n`);
        const vleagueTeamIds = vleagueTeamsRes.recordset.map(t => t.team_id);
        const teamMap = new Map();
        vleagueTeamsRes.recordset.forEach(t => {
            teamMap.set(t.team_id, t.season_team_id);
        });

        // 3. Count players before cleanup
        const beforeCount = await query(`SELECT COUNT(*) as cnt FROM FootballPlayers`);
        console.log(`Players before cleanup: ${beforeCount.recordset[0].cnt}`);

        // 4. Delete non-V-League players
        console.log("\n🗑️  Deleting non-V-League players...");

        const deleteResult = await query(`
            DELETE FROM FootballPlayers
            WHERE (internal_team_id IS NULL OR internal_team_id NOT IN (${vleagueTeamIds.join(',')}))
              AND (team_external_id IS NULL OR team_external_id NOT IN (${vleagueTeamIds.join(',')}))
        `);

        console.log(`✓ Deleted ${deleteResult.rowsAffected[0]} non-V-League players`);

        // 5. Count  after cleanup
        const afterCount = await query(`SELECT COUNT(*) as cnt FROM FootballPlayers`);
        console.log(`Players after cleanup: ${afterCount.recordset[0].cnt}\n`);

        // 6. Get all V-League players
        console.log("👥 Listing V-League players by team:\n");
        for (const team of vleagueTeamsRes.recordset) {
            const playersRes = await query(`
                SELECT id, name
                FROM FootballPlayers
                WHERE internal_team_id = @teamId OR team_external_id = @teamId
                ORDER BY name
            `, { teamId: team.team_id });

            console.log(`${team.name}: ${playersRes.recordset.length} players`);
        }

        // 7. Register all V-League players for season
        console.log("\n📝 Registering players for V-League 24/25...");
        let registeredCount = 0;

        for (const team of vleagueTeamsRes.recordset) {
            const playersRes = await query(`
                SELECT id
                FROM FootballPlayers
                WHERE internal_team_id = @teamId OR team_external_id = @teamId
            `, { teamId: team.team_id });

            for (const player of playersRes.recordset) {
                try {
                    // Check if already registered
                    const existsRes = await query(`
                        SELECT season_player_id
                        FROM season_player_registrations
                        WHERE season_id = @seasonId
                          AND season_team_id = @seasonTeamId
                          AND player_id = @playerId
                    `, {
                        seasonId,
                        seasonTeamId: team.season_team_id,
                        playerId: player.id
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
                        seasonId,
                        seasonTeamId: team.season_team_id,
                        playerId: player.id
                    });

                    registeredCount++;
                } catch (err: any) {
                    console.log(`  ⚠ Failed to register player ${player.id}: ${err.message}`);
                }
            }
        }

        console.log(`✓ Registered ${registeredCount} players for the season\n`);

        // 8. Final summary
        console.log("=== SUMMARY ===");
        console.log(`Deleted: ${deleteResult.rowsAffected[0]} non-V-League players`);
        console.log(`Remaining: ${afterCount.recordset[0].cnt} V-League players`);
        console.log(`Registered: ${registeredCount} players for V-League 24/25`);
        console.log("\n✅ Database cleaned and players registered!");
        console.log("\n💡 Next: You can now set lineups for matches!");

        process.exit(0);
    } catch (err: any) {
        console.error("\n❌ ERROR:", err.message);
        console.error(err);
        process.exit(1);
    }
}

run();
