import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== CREATING V-LEAGUE 24/25 SEASON (FIXED) ===\n");

    try {
        // 0. Check/Create tournament first
        console.log("0. Checking tournament...");
        let tournamentId: number;

        const tournamentRes = await query(`
            SELECT TOP 1 tournament_id, name FROM tournaments
            WHERE name LIKE '%V-League%' OR code LIKE '%VL%'
        `);

        if (tournamentRes.recordset.length > 0) {
            tournamentId = tournamentRes.recordset[0].tournament_id;
            console.log(`✓ Using existing tournament: ${tournamentRes.recordset[0].name} (ID: ${tournamentId})`);
        } else {
            console.log("Creating V-League tournament...");
            const createTournamentRes = await query<{ tournament_id: number }>(`
                INSERT INTO tournaments (code, name, description, region, is_active, created_by)
                OUTPUT INSERTED.tournament_id
                VALUES ('VL', 'V-League', 'Giải Vô địch Bóng đá Quốc gia Việt Nam', 'Vietnam', 1, 1)
            `);
            tournamentId = createTournamentRes.recordset[0].tournament_id;
            console.log(`✓ Created tournament ID: ${tournamentId}`);
        }

        // 1. Identify V-League teams
        console.log("\n1. Identifying V-League teams...");

        const teamsRes = await query(`
            SELECT team_id, name, city
            FROM teams
            WHERE name LIKE '%Viettel%'
               OR name LIKE '%Hà Nội%'
               OR name LIKE '%TP.HCM%' OR name LIKE '%TPHCM%' OR name LIKE '%TP HCM%'
               OR name LIKE '%Thanh Hóa%'
               OR name LIKE '%Hải Phòng%'
               OR name LIKE '%Bình Dương%'
               OR name LIKE '%Nam Định%'
               OR name LIKE '%Công An%'
               OR name LIKE '%Hà Tĩnh%'
               OR name LIKE '%Quảng Nam%'
               OR name LIKE '%Khánh Hòa%'
               OR name LIKE '%Đà Nẵng%' OR name LIKE '%SHB%'
               OR name LIKE '%Bình Định%'
               OR name LIKE '%HAGL%' OR name LIKE '%Hoàng Anh Gia Lai%'
               OR name LIKE '%Becamex%'
               OR name LIKE '%Hồng Lĩnh%'
               OR city LIKE '%Thanh Hóa%' OR city LIKE '%Hà Nội%' OR city LIKE '%TP.HCM%'
            ORDER BY name
        `);

        if (teamsRes.recordset.length === 0) {
            console.log("❌ No V-League teams found!");
            console.log("\nShowing all teams...");
            const allTeams = await query(`SELECT TOP 15 team_id, name FROM teams ORDER BY name`);
            allTeams.recordset.forEach(t => console.log(`  - ${t.name} (ID: ${t.team_id})`));
            process.exit(1);
        }

        console.log(`✓ Found ${teamsRes.recordset.length} V-League teams:`);
        teamsRes.recordset.forEach((team, idx) => {
            console.log(`   ${idx + 1}. ${team.name} (ID: ${team.team_id})`);
        });

        const teamIds = teamsRes.recordset.map(t => t.team_id);

        // 2. Check for ruleset
        console.log("\n2. Getting ruleset...");
        let rulesetId: number;
        const rulesetRes = await query(`SELECT TOP 1 ruleset_id FROM rulesets WHERE is_active = 1`);

        if (rulesetRes.recordset.length === 0) {
            console.log("Creating default ruleset...");
            const createRulesetRes = await query<{ ruleset_id: number }>(`
                INSERT INTO rulesets (name, version_tag, description, is_active, created_by)
                OUTPUT INSERTED.ruleset_id
                VALUES ('V-League Standard Rules', 'v1.0', 'Standard V-League rules', 1, 1)
            `);
            rulesetId = createRulesetRes.recordset[0].ruleset_id;
            console.log(`✓ Created ruleset ID: ${rulesetId}`);
        } else {
            rulesetId = rulesetRes.recordset[0].ruleset_id;
            console.log(`✓ Using ruleset ID: ${rulesetId}`);
        }

        // 3. Check if season exists
        console.log("\n3. Checking for existing V-League 24/25 season...");
        const existingSeasonRes = await query(`
            SELECT season_id, name, status
            FROM seasons
            WHERE name LIKE '%V-League%24/25%' OR name LIKE '%V.League%24/25%' OR code = 'VL2425'
        `);

        let seasonId: number;

        if (existingSeasonRes.recordset.length > 0) {
            console.log(`✓ Season already exists: ${existingSeasonRes.recordset[0].name} (ID: ${existingSeasonRes.recordset[0].season_id})`);
            seasonId = existingSeasonRes.recordset[0].season_id;
        } else {
            console.log("Creating V-League 24/25 season...");
            const numTeams = teamsRes.recordset.length;
            const createSeasonRes = await query<{ season_id: number }>(`
                INSERT INTO seasons (
                    tournament_id,
                    ruleset_id,
                    name,
                    code,
                    description,
                    start_date,
                    end_date,
                    participation_fee,
                    max_teams,
                    expected_rounds,
                    status,
                    created_by
                )
                OUTPUT INSERTED.season_id
                VALUES (
                    @tournamentId,
                    @rulesetId,
                    'V-League 2024/25',
                    'VL2425',
                    'Giải Vô địch Bóng đá Quốc gia Việt Nam 2024-2025',
                    '2024-08-01',
                    '2025-05-31',
                    0,
                    @maxTeams,
                    @expectedRounds,
                    'in_progress',
                    1
                )
            `, {
                tournamentId,
                rulesetId,
                maxTeams: Math.max(10, numTeams),
                expectedRounds: Math.max(18, (numTeams - 1) * 2)
            });

            seasonId = createSeasonRes.recordset[0].season_id;
            console.log(`✓ Created season ID: ${seasonId}`);
        }

        // 4. Add teams to season
        console.log("\n4. Adding teams to season participants...");
        let addedCount = 0;

        for (const teamId of teamIds) {
            try {
                const existsRes = await query(`
                    SELECT season_team_id FROM season_team_participants
                    WHERE season_id = @seasonId AND team_id = @teamId
                `, { seasonId, teamId });

                if (existsRes.recordset.length > 0) {
                    console.log(`   - Team ${teamId} already in season`);
                    continue;
                }

                await query(`
                    INSERT INTO season_team_participants (season_id, team_id, status)
                    VALUES (@seasonId, @teamId, 'active')
                `, { seasonId, teamId });
                console.log(`   + Added team ${teamId}`);
                addedCount++;
            } catch (err: any) {
                console.log(`   ⚠ Failed to add team ${teamId}: ${err.message}`);
            }
        }

        console.log(`\n✓ Added ${addedCount} new teams to season`);

        // Summary
        console.log("\n=== SUCCESS ===");
        console.log(`Season ID: ${seasonId}`);
        console.log(`Season Name: V-League 2024/25`);
        console.log(`Total Teams: ${teamsRes.recordset.length}`);
        console.log(`\nNext: Run match schedule generation script`);

        process.exit(0);
    } catch (err: any) {
        console.error("\n❌ ERROR:", err.message);
        console.error("Error number:", err.number);
        console.error(err);
        process.exit(1);
    }
}

run();
