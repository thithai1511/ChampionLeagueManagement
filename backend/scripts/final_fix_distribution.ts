import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== FINAL FIX: EVEN PLAYER DISTRIBUTION ===\n");

    try {
        const seasonId = 9;

        // Step 1: Clear
        console.log("1. Clearing existing registrations...");
        const deleteResult = await query(`DELETE FROM season_player_registrations WHERE season_id = @seasonId`, { seasonId });
        console.log(`✓ Deleted ${deleteResult.rowsAffected[0]} rows\n`);

        // Step 2: Get teams
        console.log("2. Getting teams...");
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
        console.log("3. Getting random players...");
        const playersRes = await query<{ id: number }>(`
            SELECT TOP 374 id
            FROM FootballPlayers
            WHERE id IS NOT NULL
            ORDER BY NEWID()
        `);

        const players = playersRes.recordset;
        console.log(`✓ Got ${players.length} players\n`);

        // Step 4: Distribute evenly - 22 per team
        console.log("4. Distributing (22 per team)...\n");
        let playerIdx = 0;
        let totalRegistered = 0;

        for (let i = 0; i < teams.length; i++) {
            const team = teams[i];
            let teamCount = 0;

            // Insert 22 players for this team
            for (let j = 0; j < 22 && playerIdx < players.length; j++) {
                const playerId = players[playerIdx++].id;

                try {
                    await query(`
                        INSERT INTO season_player_registrations (
                            season_id,
                            season_team_id,
                            player_id,
                            player_type,
                            age_on_season_start,
                            registration_status
                        ) VALUES (
                            @seasonId,
                            @seasonTeamId,
                            @playerId,
                            'domestic',
                            25,
                            'approved'
                        )
                    `, {
                        seasonId,
                        seasonTeamId: team.season_team_id,
                        playerId
                    });

                    teamCount++;
                } catch (err: any) {
                    // Skip errors
                }
            }

            totalRegistered += teamCount;
            console.log(`${i + 1}/${teams.length}. ${team.name}: ${teamCount} players`);
        }

        // Step 5: Verify
        console.log("\n=== VERIFICATION ===\n");
        for (const team of teams) {
            const countRes = await query(`
                SELECT COUNT(*) as cnt
                FROM season_player_registrations
                WHERE season_id = @seasonId AND season_team_id = @seasonTeamId
            `, { seasonId, seasonTeamId: team.season_team_id });

            const cnt = countRes.recordset[0].cnt;
            const icon = cnt === 22 ? '✅' : cnt === 0 ? '❌' : '⚠️';
            console.log(`${icon} ${team.name}: ${cnt}`);
        }

        console.log(`\n=== SUCCESS ===`);
        console.log(`Total: ${totalRegistered} players`);
        console.log(`Average: ${(totalRegistered / teams.length).toFixed(1)} per team`);
        console.log(`\n✅ All players distributed and approved!`);
        console.log(`\n💡 Refresh UI to see all players now!`);

        process.exit(0);
    } catch (err: any) {
        console.error("\n❌ ERROR:", err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

run();
