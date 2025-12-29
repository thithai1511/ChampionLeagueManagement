import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== CREATING V-LEAGUE 2026 (SIMPLE VERSION) ===\n");

    try {
        // 1. Get template from 24/25
        console.log("1. Getting V-League 24/25 template...");
        const template = await query<{ season_id: number, tournament_id: number, ruleset_id: number }>(`
            SELECT season_id, tournament_id, ruleset_id FROM seasons WHERE code = 'VL2425'
        `);

        if (template.recordset.length === 0) {
            console.log("❌ V-League 24/25 not found!");
            process.exit(1);
        }

        const { season_id: oldSeasonId, tournament_id, ruleset_id } = template.recordset[0];
        console.log(`✓ Template season ID: ${oldSeasonId}\n`);

        // 2. Create season 2026
        console.log("2. Creating V-League 2025/26...");
        let newSeasonId: number;

        try {
            const createRes = await query<{ season_id: number }>(`
                INSERT INTO seasons (
                    tournament_id, ruleset_id,
                    name, code, description,
                    start_date, end_date,
                    participation_fee, max_teams, expected_rounds,
                   status, created_by
                )
                OUTPUT INSERTED.season_id
                VALUES (
                    @tournamentId, @rulesetId,
                    'V-League 2025/26', 'VL2526',
                    'Giải Vô địch Bóng đá Quốc gia Việt Nam 2025-2026',
                    '2025-08-01', '2026-05-31',
                    0, 16, 30,
                    'planned', 1
                )
            `, { tournamentId: tournament_id, rulesetId: ruleset_id });

            newSeasonId = createRes.recordset[0].season_id;
            console.log(`✓ Created season ID: ${newSeasonId}\n`);
        } catch (createErr: any) {
            console.error("Failed to create season:", createErr.message);

            // Check if already exists
            const existingRes = await query<{ season_id: number }>(`
                SELECT season_id FROM seasons WHERE code = 'VL2526'
            `);

            if (existingRes.recordset.length > 0) {
                newSeasonId = existingRes.recordset[0].season_id;
                console.log(`✓ Using existing season ID: ${newSeasonId}\n`);
            } else {
                throw createErr;
            }
        }

        // 3. Copy teams
        console.log("3. Copying teams...");
        const oldTeams = await query<{ team_id: number }>(`
            SELECT team_id FROM season_team_participants WHERE season_id = @oldSeasonId
        `, { oldSeasonId });

        let teamsAdded = 0;
        for (const team of oldTeams.recordset) {
            try {
                await query(`
                    INSERT INTO season_team_participants (season_id, team_id, status)
                    VALUES (@newSeasonId, @teamId, 'active')
                `, { newSeasonId, teamId: team.team_id });
                teamsAdded++;
            } catch (err) {
                // Skip duplicates
            }
        }
        console.log(`✓ Added ${teamsAdded} teams\n`);

        // 4. Register players
        console.log("4. Registering players...");

        // Get new season_team_ids mapping
        const newTeams = await query<{ season_team_id: number, team_id: number }>(`
            SELECT season_team_id, team_id
            FROM season_team_participants
            WHERE season_id = @newSeasonId
        `, { newSeasonId });

        const teamIdMap = new Map();
        newTeams.recordset.forEach(t => teamIdMap.set(t.team_id, t.season_team_id));

        let playersRegistered = 0;
        for (const newTeam of newTeams.recordset) {
            // Get players from old season for this team_id
            const players = await query<{ player_id: number }>(`
                SELECT DISTINCT spr.player_id
                FROM season_player_registrations spr
                JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
                WHERE spr.season_id = @oldSeasonId AND stp.team_id = @teamId
            `, { oldSeasonId, teamId: newTeam.team_id });

            for (const player of players.recordset) {
                try {
                    await query(`
                        INSERT INTO season_player_registrations (
                            season_id, season_team_id, player_id,
                            status, registration_fee_paid, registered_by
                        ) VALUES (
                            @seasonId, @seasonTeamId, @playerId,
                            'active', 1, 1
                        )
                    `, {
                        seasonId: newSeasonId,
                        seasonTeamId: newTeam.season_team_id,
                        playerId: player.player_id
                    });
                    playersRegistered++;
                } catch (err) {
                    // Skip duplicates
                }
            }
        }
        console.log(`✓ Registered ${playersRegistered} players\n`);

        // 5. Generate matches
        console.log("5. Generating matches...");
        const teams = newTeams.recordset;
        const startDate = new Date('2025-08-10');
        let matchDate = new Date(startDate);
        let created = 0;
        let round = 1;

        // Simple schedule - first leg only for now
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                try {
                    await query(`
                        INSERT INTO matches (
                            season_id, competition_code, round_number,
                            home_season_team_id, away_season_team_id,
                            scheduled_kickoff, status
                        ) VALUES (
                            @seasonId, 'VL', @round,
                            @homeId, @awayId, @kickoff, 'scheduled'
                        )
                    `, {
                        seasonId: newSeasonId,
                        round,
                        homeId: teams[i].season_team_id,
                        awayId: teams[j].season_team_id,
                        kickoff: matchDate.toISOString()
                    });
                    created++;

                    if (created % 4 === 0) {
                        matchDate = new Date(matchDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                        round++;
                    }
                } catch (err: any) {
                    console.log(`  Skip match ${i} vs ${j}: ${err.message.substring(0, 50)}`);
                }
            }
        }
        console.log(`✓ Created ${created} matches\n`);

        // Summary
        console.log("=== SUCCESS ===");
        console.log(`Season: V-League 2025/26`);
        console.log(`ID: ${newSeasonId}`);
        console.log(`Teams: ${teamsAdded}`);
        console.log(`Players: ${playersRegistered}`);
        console.log(`Matches: ${created}`);
        console.log(`\n✅ Ready to use!`);

        process.exit(0);
    } catch (err: any) {
        console.error("\n❌ ERROR:", err.message);
        if (err.number) console.error(`SQL Error ${err.number} at line ${err.lineNumber}`);
        process.exit(1);
    }
}

run();
