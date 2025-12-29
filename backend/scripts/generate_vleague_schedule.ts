import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== GENERATING V-LEAGUE 24/25 MATCH SCHEDULE ===\n");

    try {
        // 1. Get season
        console.log("1. Finding V-League 24/25 season...");
        const seasonRes = await query<{ season_id: number, name: string }>(`
            SELECT season_id, name
            FROM seasons
            WHERE code = 'VL2425' OR name LIKE '%V-League%24/25%'
        `);

        if (seasonRes.recordset.length === 0) {
            console.log("❌ V-League 24/25 season not found! Run create_vleague_season.ts first.");
            process.exit(1);
        }

        const season = seasonRes.recordset[0];
        console.log(`✓ Found season: ${season.name} (ID: ${season.season_id})`);

        // 2. Get participating teams
        console.log("\n2. Getting participating teams...");
        const teamsRes = await query<{ season_team_id: number, team_id: number, team_name: string }>(`
            SELECT 
                stp.season_team_id,
                stp.team_id,
                t.name as team_name
            FROM season_team_participants stp
            JOIN teams t ON stp.team_id = t.team_id
            WHERE stp.season_id = @seasonId AND stp.status = 'active'
            ORDER BY t.name
        `, { seasonId: season.season_id });

        console.log(`✓ Found ${teamsRes.recordset.length} teams:`);
        teamsRes.recordset.forEach((team, idx) => {
            console.log(`   ${idx + 1}. ${team.team_name} (Team ID: ${team.team_id}, Season Team ID: ${team.season_team_id})`);
        });

        const teams = teamsRes.recordset;
        if (teams.length < 2) {
            console.log("❌ Need at least 2 teams to generate schedule!");
            process.exit(1);
        }

        // 3. Check existing matches
        console.log("\n3. Checking for existing matches...");
        const existingMatchesRes = await query(`
            SELECT COUNT(*) as cnt
            FROM matches
            WHERE season_id = @seasonId
        `, { seasonId: season.season_id });

        const existingCount = existingMatchesRes.recordset[0].cnt;
        if (existingCount > 0) {
            console.log(`⚠  Found ${existingCount} existing matches. Skipping schedule generation.`);
            console.log(`   Delete existing matches first if you want to regenerate.`);
            process.exit(0);
        }

        // 4. Generate round-robin schedule (home & away)
        console.log("\n4. Generating round-robin schedule...");
        const startDate = new Date('2024-08-10');  // V-League typically starts early August
        let matchDate = new Date(startDate);
        let matchesCreated = 0;
        let round = 1;

        // First leg (everyone plays everyone once - home)
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                const homeTeam = teams[i];
                const awayTeam = teams[j];

                try {
                    await query(`
                        INSERT INTO matches (
                            season_id,
                            competition_code,
                            round_number,
                            home_season_team_id,
                            away_season_team_id,
                            scheduled_kickoff,
                            status
                        ) VALUES (
                            @seasonId,
                            'VL',
                            @round,
                            @homeTeamId,
                            @awayTeamId,
                            @kickoff,
                            'scheduled'
                        )
                    `, {
                        seasonId: season.season_id,
                        round,
                        homeTeamId: homeTeam.season_team_id,
                        awayTeamId: awayTeam.season_team_id,
                        kickoff: matchDate.toISOString()
                    });

                    matchesCreated++;

                    // Move to next week (V-League usually plays weekly on weekends)
                    if (matchesCreated % (teams.length / 2) === 0) {
                        matchDate = new Date(matchDate.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
                        round++;
                    }
                } catch (err: any) {
                    console.log(`   ⚠ Failed to create match ${homeTeam.team_name} vs ${awayTeam.team_name}: ${err.message}`);
                }
            }
        }

        console.log(`✓ Created ${matchesCreated} first-leg matches (${round - 1} rounds)`);

        // Second leg (return fixtures - away becomes home)
        console.log("\n5. Generating return fixtures...");
        const secondLegStart = new Date(matchDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks break
        matchDate = secondLegStart;
        let secondLegMatches = 0;

        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                const homeTeam = teams[j];  // Reversed
                const awayTeam = teams[i];  // Reversed

                try {
                    await query(`
                        INSERT INTO matches (
                            season_id,
                            competition_code,
                            round_number,
                            home_season_team_id,
                            away_season_team_id,
                            scheduled_kickoff,
                            status
                        ) VALUES (
                            @seasonId,
                            'VL',
                            @round,
                            @homeTeamId,
                            @awayTeamId,
                            @kickoff,
                            'scheduled'
                        )
                    `, {
                        seasonId: season.season_id,
                        round,
                        homeTeamId: homeTeam.season_team_id,
                        awayTeamId: awayTeam.season_team_id,
                        kickoff: matchDate.toISOString()
                    });

                    secondLegMatches++;

                    if (secondLegMatches % (teams.length / 2) === 0) {
                        matchDate = new Date(matchDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                        round++;
                    }
                } catch (err: any) {
                    console.log(`   ⚠ Failed to create return match: ${err.message}`);
                }
            }
        }

        console.log(`✓ Created ${secondLegMatches} second-leg matches`);

        // Summary
        console.log("\n=== SUCCESS ===");
        console.log(`Total matches created: ${matchesCreated + secondLegMatches}`);
        console.log(`Season: V-League 2024/25 (ID: ${season.season_id})`);
        console.log(`Teams: ${teams.length}`);
        console.log(`Rounds: ${round - 1}`);
        console.log(`Match period: ${startDate.toISOString().split('T')[0]} to ${matchDate.toISOString().split('T')[0]}`);
        console.log(`\n✅ V-League 24/25 schedule generated!`);

        process.exit(0);
    } catch (err: any) {
        console.error("\n❌ ERROR:", err.message);
        console.error(err);
        process.exit(1);
    }
}

run();
