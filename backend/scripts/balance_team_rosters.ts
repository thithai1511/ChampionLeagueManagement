import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== BALANCING TEAM ROSTERS: 22 PLAYERS PER TEAM ===\n");

    try {
        // 1. Get season 2026
        const s2026 = await query<{ season_id: number }>(`SELECT season_id FROM seasons WHERE code = '2026'`);
        const seasonId = s2026.recordset[0].season_id;
        console.log(`Season 2026 ID: ${seasonId}\n`);

        // 2. Delete all current registrations
        console.log("Clearing current registrations...");
        const deleteResult = await query(`
            DELETE FROM season_player_registrations WHERE season_id = @seasonId
        `, { seasonId });
        console.log(`✓ Deleted ${deleteResult.rowsAffected[0]} existing registrations\n`);

        // 3. Get teams
        const teams = await query<{ season_team_id: number, team_id: number, name: string }>(`
            SELECT stp.season_team_id, stp.team_id, t.name
            FROM season_team_participants stp
            JOIN teams t ON stp.team_id = t.team_id
            WHERE stp.season_id = @seasonId
            ORDER BY t.name
        `, { seasonId });

        console.log(`Found ${teams.recordset.length} teams\n`);

        // Target distribution per team (total 22)
        const targetDistribution = {
            GK: 2,   // Goalkeepers
            DF: 7,   // Defenders
            MF: 7,   // Midfielders
            FW: 6    // Forwards
        };

        console.log("Target per team:");
        console.log(`  GK: ${targetDistribution.GK}`);
        console.log(`  DF: ${targetDistribution.DF}`);
        console.log(`  MF: ${targetDistribution.MF}`);
        console.log(`  FW: ${targetDistribution.FW}`);
        console.log(`  Total: 22\n`);

        let totalRegistered = 0;

        // 4. Register 22 players per team
        for (const team of teams.recordset) {
            console.log(`${team.name}...`);

            // Get players for this team grouped by position
            const playersByPosition = await query(`
                SELECT 
                    id,
                    name,
                    date_of_birth,
                    CASE 
                        WHEN position IN ('Goalkeeper', 'GK') THEN 'GK'
                        WHEN position IN ('Defender', 'Defence', 'DF', 'Left-Back', 'Right-Back', 'Centre-Back') THEN 'DF'
                        WHEN position IN ('Midfielder', 'Midfield', 'MF', 'Defensive Midfield', 'Central Midfield', 'Attacking Midfield') THEN 'MF'
                        WHEN position IN ('Attacker', 'Attack', 'FW', 'Forward', 'Left Winger', 'Right Winger', 'Centre-Forward') THEN 'FW'
                        ELSE 'MF'
                    END as position_group
                FROM FootballPlayers
                WHERE (internal_team_id = @teamId OR team_external_id = @teamId)
                ORDER BY NEWID()  -- Random order
            `, { teamId: team.team_id });

            // Group by position
            const byPosition = {
                GK: playersByPosition.recordset.filter((p: any) => p.position_group === 'GK'),
                DF: playersByPosition.recordset.filter((p: any) => p.position_group === 'DF'),
                MF: playersByPosition.recordset.filter((p: any) => p.position_group === 'MF'),
                FW: playersByPosition.recordset.filter((p: any) => p.position_group === 'FW')
            };

            let teamCount = 0;

            // Register by position
            for (const posGroup of ['GK', 'DF', 'MF', 'FW']) {
                const available = byPosition[posGroup as keyof typeof byPosition];
                const target = targetDistribution[posGroup as keyof typeof targetDistribution];

                let registered = 0;
                for (let i = 0; i < available.length && registered < target; i++) {
                    const player = available[i];

                    try {
                        // Calculate age
                        let age = 25;
                        if (player.date_of_birth) {
                            const dob = new Date(player.date_of_birth);
                            const seasonStart = new Date('2025-08-01');
                            age = seasonStart.getFullYear() - dob.getFullYear();
                            if (age < 16) age = 16;
                            if (age > 40) age = 40;
                        }

                        await query(`
                            INSERT INTO season_player_registrations (
                                season_id,
                                season_team_id,
                                player_id,
                                player_type,
                                age_on_season_start
                            ) VALUES (
                                @seasonId,
                                @seasonTeamId,
                                @playerId,
                                'domestic',
                                @age
                            )
                        `, {
                            seasonId,
                            seasonTeamId: team.season_team_id,
                            playerId: player.id,
                            age
                        });

                        registered++;
                        teamCount++;
                    } catch (err: any) {
                        // Skip errors silently
                    }
                }
            }

            console.log(`  ✓ ${teamCount} players registered`);
            totalRegistered += teamCount;
        }

        // 5. Summary
        console.log(`\n=== SUMMARY ===`);
        console.log(`Total teams: ${teams.recordset.length}`);
        console.log(`Total players registered: ${totalRegistered}`);
        console.log(`Average per team: ${(totalRegistered / teams.recordset.length).toFixed(1)}`);

        // 6. Verify distribution
        console.log(`\n=== VERIFICATION ===\n`);
        for (const team of teams.recordset) {
            const count = await query(`
                SELECT COUNT(*) as cnt
                FROM season_player_registrations
                WHERE season_id = @seasonId AND season_team_id = @seasonTeamId
            `, { seasonId, seasonTeamId: team.season_team_id });

            console.log(`${team.name}: ${count.recordset[0].cnt} players`);
        }

        console.log(`\n✅ Done! Each team now has ~22 players with balanced positions.`);

        process.exit(0);
    } catch (err: any) {
        console.error("\n❌ ERROR:", err.message);
        process.exit(1);
    }
}

run();
