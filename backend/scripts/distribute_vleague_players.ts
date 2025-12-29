import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== DISTRIBUTING PLAYERS TO V-LEAGUE TEAMS ===\n");

    try {
        // 1. Get V-League season
        const seasonRes = await query<{ season_id: number }>(`SELECT season_id FROM seasons WHERE code = 'VL2425'`);
        if (seasonRes.recordset.length === 0) {
            console.log("❌ V-League 24/25 season not found!");
            process.exit(1);
        }
        const seasonId = seasonRes.recordset[0].season_id;

        // 2. Get V-League teams
        console.log("1. Getting V-League teams...");
        const teamsRes = await query(`
            SELECT 
                stp.season_team_id,
                stp.team_id,
                t.name
            FROM season_team_participants stp
            JOIN teams t ON stp.team_id = t.team_id
            WHERE stp.season_id = @seasonId
            ORDER BY t.name
        `, { seasonId });

        console.log(`✓ Found ${teamsRes.recordset.length} teams:\n`);
        teamsRes.recordset.forEach((t, idx) => {
            console.log(`   ${idx + 1}. ${t.name}`);
        });

        const teams = teamsRes.recordset;

        // 3. Get all players grouped by position
        console.log("\n2. Getting all players by position...");
        const playersRes = await query(`
            SELECT 
                id,
                name,
                position,
                CASE 
                    WHEN position IN ('Goalkeeper', 'GK') THEN 'GK'
                    WHEN position IN ('Defender', 'Defence', 'DF', 'Left-Back', 'Right-Back', 'Centre-Back') THEN 'DF'
                    WHEN position IN ('Midfielder', 'Midfield', 'MF', 'Defensive Midfield', 'Central Midfield', 'Attacking Midfield') THEN 'MF'
                    WHEN position IN ('Attacker', 'Attack', 'FW', 'Forward', 'Left Winger', 'Right Winger', 'Centre-Forward') THEN 'FW'
                    ELSE 'MF'
                END as position_group
            FROM FootballPlayers
            WHERE id IS NOT NULL
            ORDER BY NEWID()  -- Random order
        `);

        const allPlayers = playersRes.recordset;
        console.log(`✓ Found ${allPlayers.length} players total\n`);

        // Group by position
        const playersByPosition = {
            GK: allPlayers.filter((p: any) => p.position_group === 'GK'),
            DF: allPlayers.filter((p: any) => p.position_group === 'DF'),
            MF: allPlayers.filter((p: any) => p.position_group === 'MF'),
            FW: allPlayers.filter((p: any) => p.position_group === 'FW')
        };

        console.log("Players by position:");
        console.log(`   Goalkeepers (GK): ${playersByPosition.GK.length}`);
        console.log(`   Defenders (DF): ${playersByPosition.DF.length}`);
        console.log(`   Midfielders (MF): ${playersByPosition.MF.length}`);
        console.log(`   Forwards (FW): ${playersByPosition.FW.length}`);

        // 4. Distribute players evenly
        console.log("\n3. Distributing players to teams...");

        const playersPerTeam = Math.floor(allPlayers.length / teams.length);
        console.log(`Target: ~${playersPerTeam} players per team\n`);

        // Target distribution per team
        const targetPerTeam = {
            GK: Math.max(2, Math.floor(playersByPosition.GK.length / teams.length)),
            DF: Math.max(6, Math.floor(playersByPosition.DF.length / teams.length)),
            MF: Math.max(6, Math.floor(playersByPosition.MF.length / teams.length)),
            FW: Math.max(4, Math.floor(playersByPosition.FW.length / teams.length))
        };

        console.log("Target distribution per team:");
        console.log(`   GK: ${targetPerTeam.GK}`);
        console.log(`   DF: ${targetPerTeam.DF}`);
        console.log(`   MF: ${targetPerTeam.MF}`);
        console.log(`   FW: ${targetPerTeam.FW}`);
        console.log(`   Total: ${targetPerTeam.GK + targetPerTeam.DF + targetPerTeam.MF + targetPerTeam.FW}\n`);

        let updatedCount = 0;
        let registeredCount = 0;

        for (let teamIdx = 0; teamIdx < teams.length; teamIdx++) {
            const team = teams[teamIdx];
            console.log(`Assigning players to ${team.name}...`);

            // Assign players by position
            for (const posGroup of ['GK', 'DF', 'MF', 'FW']) {
                const available = playersByPosition[posGroup as keyof typeof playersByPosition];
                const target = targetPerTeam[posGroup as keyof typeof targetPerTeam];

                for (let i = 0; i < target && available.length > 0; i++) {
                    const player = available.shift();
                    if (!player) continue;

                    try {
                        // Update player's team
                        await query(`
                            UPDATE FootballPlayers
                            SET internal_team_id = @teamId
                            WHERE id = @playerId
                        `, {
                            teamId: team.team_id,
                            playerId: player.id
                        });
                        updatedCount++;

                        // Register for season
                        try {
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
                        } catch (regErr) {
                            // Ignore duplicate registration errors
                        }
                    } catch (err: any) {
                        console.log(`   ⚠ Failed to assign player ${player.id}: ${err.message}`);
                    }
                }
            }
        }

        // 5. Distribute remaining players
        console.log("\n4. Distributing remaining players...");
        const remaining = [
            ...playersByPosition.GK,
            ...playersByPosition.DF,
            ...playersByPosition.MF,
            ...playersByPosition.FW
        ];

        console.log(`${remaining.length} players remaining`);

        for (let i = 0; i < remaining.length; i++) {
            const player = remaining[i];
            const team = teams[i % teams.length];

            try {
                await query(`
                    UPDATE FootballPlayers
                    SET internal_team_id = @teamId
                    WHERE id = @playerId
                `, {
                    teamId: team.team_id,
                    playerId: player.id
                });
                updatedCount++;

                try {
                    await query(`
                        INSERT INTO season_player_registrations (
                            season_id, season_team_id, player_id, status, registration_fee_paid, registered_by
                        ) VALUES (@seasonId, @seasonTeamId, @playerId, 'active', 1, 1)
                    `, {
                        seasonId,
                        seasonTeamId: team.season_team_id,
                        playerId: player.id
                    });
                    registeredCount++;
                } catch (regErr) {
                    // Ignore
                }
            } catch (err) {
                // Ignore
            }
        }

        // 6. Verify distribution
        console.log("\n5. Verifying distribution...\n");
        for (const team of teams) {
            const countRes = await query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN position IN ('Goalkeeper', 'GK') THEN 1 ELSE 0 END) as gk,
                    SUM(CASE WHEN position IN ('Defender', 'Defence', 'DF', 'Left-Back', 'Right-Back', 'Centre-Back') THEN 1 ELSE 0 END) as df,
                    SUM(CASE WHEN position IN ('Midfielder', 'Midfield', 'MF', 'Defensive Midfield', 'Central Midfield', 'Attacking Midfield') THEN 1 ELSE 0 END) as mf,
                    SUM(CASE WHEN position IN ('Attacker', 'Attack', 'FW', 'Forward', 'Left Winger', 'Right Winger', 'Centre-Forward') THEN 1 ELSE 0 END) as fw
                FROM FootballPlayers
                WHERE internal_team_id = @teamId OR team_external_id = @teamId
            `, { teamId: team.team_id });

            const counts = countRes.recordset[0];
            console.log(`${team.name}: ${counts.total} players (GK: ${counts.gk}, DF: ${counts.df}, MF: ${counts.mf}, FW: ${counts.fw})`);
        }

        // Summary
        console.log("\n=== SUMMARY ===");
        console.log(`Players assigned to teams: ${updatedCount}`);
        console.log(`Players registered for V-League 24/25: ${registeredCount}`);
        console.log(`\n✅ Distribution complete!`);
        console.log(`\n💡 Next: You can now set lineups for matches!`);

        process.exit(0);
    } catch (err: any) {
        console.error("\n❌ ERROR:", err.message);
        console.error(err);
        process.exit(1);
    }
}

run();
