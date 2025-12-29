import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== ULTRA-SAFE PLAYER REDISTRIBUTION ===\n");

    try {
        const seasonId = 9;

        // Step 1: Clear
        console.log("Step 1: Clearing existing registrations...");
        try {
            await query(`DELETE FROM season_player_registrations WHERE season_id = @seasonId`, { seasonId });
            console.log("✓ Cleared\n");
        } catch (err: any) {
            console.error("Failed to clear:", err.message);
            throw err;
        }

        // Step 2: Get teams
        console.log("Step 2: Getting teams...");
        const teamsRes = await query<{ season_team_id: number, name: string }>(`
            SELECT season_team_id, name
            FROM season_team_participants stp
            JOIN teams t ON stp.team_id = t.team_id
            WHERE stp.season_id = @seasonId
            ORDER BY t.name
        `, { seasonId });

        const teams = teamsRes.recordset;
        console.log(`✓ Found ${teams.length} teams\n`);

        // Step 3: Get random players
        console.log("Step 3: Getting 374 random players...");
        const playersRes = await query<{ id: number }>(`
            SELECT TOP 374 id
            FROM FootballPlayers
            WHERE id IS NOT NULL
            ORDER BY NEWID()
        `);

        const allPlayers = playersRes.recordset;
        console.log(`✓ Got ${allPlayers.length} players\n`);

        // Step 4: Distribute ONE team at a time with INDIVIDUAL inserts
        console.log("Step 4: Distributing players (22 per team)...\n");
        let playerIdx = 0;
        let grandTotal = 0;

        for (let teamNum = 0; teamNum < teams.length; teamNum++) {
            const team = teams[teamNum];
            console.log(`[${teamNum + 1}/${teams.length}] ${team.name}...`);

            let teamCount = 0;

            // Insert 22 players ONE BY ONE
            for (let i = 0; i < 22 && playerIdx < allPlayers.length; i++) {
                const playerId = allPlayers[playerIdx++].id;

                try {
                    await query(`
                        INSERT INTO season_player_registrations 
                        (season_id, season_team_id, player_id, player_type, age_on_season_start, registration_status)
                        VALUES (@seasonId, @seasonTeamId, @playerId, @playerType, @age, @status)
                    `, {
                        seasonId: seasonId,
                        seasonTeamId: team.season_team_id,
                        playerId: playerId,
                        playerType: 'domestic',
                        age: 25,
                        status: 'approved'
                    });

                    teamCount++;
                } catch (insertErr: any) {
                    console.log(`  ⚠ Player ${playerId} failed: ${insertErr.message.substring(0, 50)}`);
                    // Continue with next player
                }
            }

            grandTotal += teamCount;
            console.log(`  ✓ Registered ${teamCount} players`);
        }

        // Step 5: Verify
        console.log(`\n=== VERIFICATION ===\n`);
        for (const team of teams) {
            const countRes = await query(`
                SELECT COUNT(*) as cnt
                FROM season_player_registrations
                WHERE season_id = @seasonId AND season_team_id = @seasonTeamId
            `, { seasonId, seasonTeamId: team.season_team_id });

            const cnt = countRes.recordset[0].cnt;
            const status = cnt === 22 ? '✅' : cnt === 0 ? '❌' : '⚠️';
            console.log(`${status} ${team.name}: ${cnt} players`);
        }

        console.log(`\n=== SUCCESS ===`);
        console.log(`Total registered: ${grandTotal} players`);
        console.log(`\n✅ Redistribution complete!`);
        console.log(`💡 Refresh UI - both teams should now have players!`);

        process.exit(0);

    } catch (err: any) {
        console.error("\n❌ FATAL ERROR:");
        console.error("Message:", err.message);
        console.error("Code:", err.code);
        console.error("Number:", err.number);
        console.error("\nStack:", err.stack);
        process.exit(1);
    }
}

run();
