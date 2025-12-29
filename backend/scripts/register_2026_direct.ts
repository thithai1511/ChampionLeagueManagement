import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== REGISTERING PLAYERS FOR SEASON 2026 (DIRECT) ===\n");

    try {
        // 1. Get season 2026
        const season2026Res = await query<{ season_id: number, name: string }>(`
            SELECT season_id, name
            FROM seasons
            WHERE code = '2026' OR name LIKE '%Mùa giải 2026%'
            ORDER BY season_id DESC
        `);

        if (season2026Res.recordset.length === 0) {
            console.log("❌ Season 2026 not found!");
            process.exit(1);
        }

        const season2026 = season2026Res.recordset[0];
        console.log(`✓ Season: ${season2026.name} (ID: ${season2026.season_id})\n`);

        // 2. Get teams in season 2026
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

        console.log(`✓ Found ${teams2026.recordset.length} teams\n`);

        // 3. Register players from FootballPlayers table
        console.log("Registering players...\n");
        let totalRegistered = 0;

        for (const team of teams2026.recordset) {
            console.log(`${team.team_name}...`);

            // Get players for this team from FootballPlayers
            const playersRes = await query<{ id: number, name: string }>(`
                SELECT id, name
                FROM FootballPlayers
                WHERE internal_team_id = @teamId OR team_external_id = @teamId
                ORDER BY name
            `, { teamId: team.team_id });

            let teamCount = 0;
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
                        seasonId: season2026.season_id,
                        seasonTeamId: team.season_team_id,
                        playerId: player.id
                    });

                    if (existsRes.recordset.length > 0) continue;

                    // Register
                    await query(`
                        INSERT INTO season_player_registrations (
                            season_id,
                            season_team_id,
                            player_id,
                            status,
                            registration_fee_paid
                        ) VALUES (
                            @seasonId,
                            @seasonTeamId,
                            @playerId,
                            'active',
                            1
                        )
                    `, {
                        seasonId: season2026.season_id,
                        seasonTeamId: team.season_team_id,
                        playerId: player.id
                    });

                    teamCount++;
                    totalRegistered++;
                } catch (err: any) {
                    if (!err.message.includes('duplicate') && !err.message.includes('UNIQUE')) {
                        console.log(`  ⚠ ${player.name}: ${err.message.substring(0, 40)}`);
                    }
                }
            }

            console.log(`  ✓ ${teamCount} players`);
        }

        // Verify
        console.log(`\n=== VERIFICATION ===`);
        const finalCount = await query(`
            SELECT COUNT(*) as cnt
            FROM season_player_registrations
            WHERE season_id = @seasonId
        `, { seasonId: season2026.season_id });

        console.log(`Total players registered: ${finalCount.recordset[0].cnt}`);
        console.log(`\n✅ SUCCESS! Season 2026 now has players!`);

        process.exit(0);
    } catch (err: any) {
        console.error("\n❌ ERROR:", err.message);
        console.error(err);
        process.exit(1);
    }
}

run();
