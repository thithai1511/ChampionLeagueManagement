/**
 * Simple Seed Script - Add matches and events to existing Season 2024
 */

import { query } from '../src/db/sqlServer';

async function seedMatches2024() {
    try {
        console.log('🌱 Starting to seed matches and events for Season 2024...\n');

        // Find Season 2024
        const season2024 = await query<{ season_id: number; name: string }>(`
      SELECT TOP 1 season_id, name FROM seasons
      WHERE name LIKE '%2024%' OR code LIKE '%2024%'
      ORDER BY season_id DESC
    `);

        if (season2024.recordset.length === 0) {
            throw new Error('Season 2024 not found!');
        }

        const seasonId = season2024.recordset[0].season_id;
        console.log(`✅ Found Season: ${season2024.recordset[0].name} (ID: ${seasonId})\n`);

        // Check existing data
        const existing = await query(`
      SELECT 
        (SELECT COUNT(*) FROM season_team_participants WHERE season_id = @seasonId) as teams,
        (SELECT COUNT(*) FROM season_rounds WHERE season_id = @seasonId) as rounds,
        (SELECT COUNT(*) FROM matches WHERE season_id = @seasonId) as matches,
        (SELECT COUNT(*) FROM match_events WHERE season_id = @seasonId) as events
    `, { seasonId });

        const stats = existing.recordset[0];
        console.log('📊 Current data:');
        console.log(`  - Teams: ${stats.teams}`);
        console.log(`  - Rounds: ${stats.rounds}`);
        console.log(`  - Matches: ${stats.matches}`);
        console.log(`  - Events: ${stats.events}\n`);

        if (stats.teams === 0) {
            console.log('⚠️  No teams registered for this season. Please register teams first.');
            process.exit(0);
        }

        // Get teams
        const teams = await query<{ season_team_id: number; team_name: string; stadium_id: number; seq: number }>(`
      SELECT 
        stp.season_team_id,
        t.name as team_name,
        ISNULL(t.home_stadium_id, (SELECT TOP 1 stadium_id FROM stadiums)) as stadium_id,
        ROW_NUMBER() OVER (ORDER BY stp.season_team_id) as seq
      FROM season_team_participants stp
      JOIN teams t ON t.team_id = stp.team_id
      WHERE stp.season_id = @seasonId
      ORDER BY stp.season_team_id
    `, { seasonId });

        console.log(`✅ Found ${teams.recordset.length} teams\n`);

        // Get or create rounds
        console.log(' 🔢 Creating rounds if needed...');
        for (let i = 1; i <= 18; i++) {
            const roundExists = await query(`
        SELECT 1 FROM season_rounds 
        WHERE season_id = @seasonId AND round_number = @round
      `, { seasonId, round: i });

            if (roundExists.recordset.length === 0) {
                await query(`
          INSERT INTO season_rounds (season_id, round_number, name, start_date, end_date, status)
          VALUES (@seasonId, @round, N'Vòng ' + CAST(@round AS NVARCHAR),
            DATEADD(WEEK, @round - 1, '2024-02-01'),
            DATEADD(WEEK, @round - 1, '2024-02-07'),
            'completed')
        `, { seasonId, round: i });
            }
        }
        console.log('  ✅ 18 rounds ready\n');

        // Get ruleset
        const rulesetResult = await query<{ ruleset_id: number }>('SELECT TOP 1 ruleset_id FROM rulesets WHERE is_active = 1');
        const rulesetId = rulesetResult.recordset[0].ruleset_id;

        // Create matches
        console.log('⚽ Creating matches...');
        let created = 0;

        for (let round = 1; round <= 18; round++) {
            const roundResult = await query<{ round_id: number }>(`
        SELECT round_id FROM season_rounds
        WHERE season_id = @seasonId AND round_number = @round
      `, { seasonId, round });

            if (roundResult.recordset.length === 0) continue;

            const roundId = roundResult.recordset[0].round_id;

            // Create 5 matches per round (assuming 10 teams)
            const matchesPerRound = Math.floor(teams.recordset.length / 2);

            for (let matchNum = 1; matchNum <= matchesPerRound; matchNum++) {
                let homeSeq = matchNum;
                let awaySeq = teams.recordset.length + 1 - matchNum;

                // Reverse for second leg
                if (round > 9) {
                    homeSeq = teams.recordset.length + 1 - matchNum;
                    awaySeq = matchNum;
                }

                const homeTeam = teams.recordset.find(t => t.seq === homeSeq);
                const awayTeam = teams.recordset.find(t => t.seq === awaySeq);

                if (!homeTeam || !awayTeam) continue;

                // Check if exists
                const exists = await query(`
          SELECT 1 FROM matches
          WHERE season_id = @seasonId AND round_id = @roundId
            AND home_season_team_id = @homeId AND away_season_team_id = @awayId
        `, {
                    seasonId,
                    roundId,
                    homeId: homeTeam.season_team_id,
                    awayId: awayTeam.season_team_id
                });

                if (exists.recordset.length > 0) continue;

                // Random scores
                const homeScore = Math.floor(Math.random() * 4);
                const awayScore = Math.floor(Math.random() * 4);

                await query(`
          INSERT INTO matches 
          (season_id, round_id, matchday_number, home_season_team_id, away_season_team_id,
           stadium_id, ruleset_id, scheduled_kickoff, status, home_score, away_score, attendance)
          VALUES (@seasonId, @roundId, @round, @homeId, @awayId,
            @stadiumId, @rulesetId, @kickoff, 'completed', @homeScore, @awayScore, 15000)
        `, {
                    seasonId,
                    roundId,
                    round,
                    homeId: homeTeam.season_team_id,
                    awayId: awayTeam.season_team_id,
                    stadiumId: homeTeam.stadium_id,
                    rulesetId,
                    kickoff: new Date(`2024-02-${round}`).toISOString(),
                    homeScore,
                    awayScore
                });

                created++;
            }
        }

        console.log(`  ✅ Created ${created} new matches\n`);

        // Create events for matches without events
        console.log('🎯 Creating match events...');

        const matchesNoEvents = await query<{
            match_id: number;
            home_score: number;
            away_score: number;
            home_team_id: number;
            away_team_id: number;
        }>(`
      SELECT m.match_id, ISNULL(m.home_score, 0) as home_score, ISNULL(m.away_score, 0) as away_score,
        m.home_season_team_id as home_team_id, m.away_season_team_id as away_team_id
      FROM matches m
      WHERE m.season_id = @seasonId AND m.status = 'completed'
        AND NOT EXISTS (SELECT 1 FROM match_events WHERE match_id = m.match_id)
    `, { seasonId });

        let goalsCreated = 0, assistsCreated = 0, cardsCreated = 0;

        for (const match of matchesNoEvents.recordset) {
            // Home goals
            for (let i = 0; i < match.home_score; i++) {
                const scorer = await query<{ season_player_id: number }>(`
          SELECT TOP 1 season_player_id FROM season_player_registrations
          WHERE season_team_id = @teamId AND position_code != 'GK'
          ORDER BY NEWID()
        `, { teamId: match.home_team_id });

                if (scorer.recordset.length === 0) continue;

                const assist = await query<{ season_player_id: number }>(`
          SELECT TOP 1 season_player_id FROM season_player_registrations
          WHERE season_team_id = @teamId AND season_player_id != @scorerId
          ORDER BY NEWID()
        `, { teamId: match.home_team_id, scorerId: scorer.recordset[0].season_player_id });

                await query(`
          INSERT INTO match_events
          (match_id, season_id, season_team_id, season_player_id, related_season_player_id,
           ruleset_id, event_type, event_minute, goal_type_code)
          VALUES (@matchId, @seasonId, @teamId, @scorerId, @assistId, @rulesetId,
            'GOAL', @minute, 'open_play')
        `, {
                    matchId: match.match_id,
                    seasonId,
                    teamId: match.home_team_id,
                    scorerId: scorer.recordset[0].season_player_id,
                    assistId: assist.recordset.length > 0 ? assist.recordset[0].season_player_id : null,
                    rulesetId,
                    minute: Math.floor(Math.random() * 90) + 1
                });
                goalsCreated++;

                if (assist.recordset.length > 0) {
                    await query(`
            INSERT INTO match_events
            (match_id, season_id, season_team_id, season_player_id, related_season_player_id,
             ruleset_id, event_type, event_minute)
            VALUES (@matchId, @seasonId, @teamId, @assistId, @scorerId, @rulesetId,
              'ASSIST', @minute)
          `, {
                        matchId: match.match_id,
                        seasonId,
                        teamId: match.home_team_id,
                        assistId: assist.recordset[0].season_player_id,
                        scorerId: scorer.recordset[0].season_player_id,
                        rulesetId,
                        minute: Math.floor(Math.random() * 90) + 1
                    });
                    assistsCreated++;
                }
            }

            // Away goals (same logic)
            for (let i = 0; i < match.away_score; i++) {
                const scorer = await query<{ season_player_id: number }>(`
          SELECT TOP 1 season_player_id FROM season_player_registrations
          WHERE season_team_id = @teamId AND position_code != 'GK'
          ORDER BY NEWID()
        `, { teamId: match.away_team_id });

                if (scorer.recordset.length === 0) continue;

                const assist = await query<{ season_player_id: number }>(`
          SELECT TOP 1 season_player_id FROM season_player_registrations
          WHERE season_team_id = @teamId AND season_player_id != @scorerId
          ORDER BY NEWID()
        `, { teamId: match.away_team_id, scorerId: scorer.recordset[0].season_player_id });

                await query(`
          INSERT INTO match_events
          (match_id, season_id, season_team_id, season_player_id, related_season_player_id,
           ruleset_id, event_type, event_minute, goal_type_code)
          VALUES (@matchId, @seasonId, @teamId, @scorerId, @assistId, @rulesetId,
            'GOAL', @minute, 'open_play')
        `, {
                    matchId: match.match_id,
                    seasonId,
                    teamId: match.away_team_id,
                    scorerId: scorer.recordset[0].season_player_id,
                    assistId: assist.recordset.length > 0 ? assist.recordset[0].season_player_id : null,
                    rulesetId,
                    minute: Math.floor(Math.random() * 90) + 1
                });
                goalsCreated++;

                if (assist.recordset.length > 0) {
                    await query(`
            INSERT INTO match_events
            (match_id, season_id, season_team_id, season_player_id, related_season_player_id,
             ruleset_id, event_type, event_minute)
            VALUES (@matchId, @seasonId, @teamId, @assistId, @scorerId, @rulesetId,
              'ASSIST', @minute)
          `, {
                        matchId: match.match_id,
                        seasonId,
                        teamId: match.away_team_id,
                        assistId: assist.recordset[0].season_player_id,
                        scorerId: scorer.recordset[0].season_player_id,
                        rulesetId,
                        minute: Math.floor(Math.random() * 90) + 1
                    });
                    assistsCreated++;
                }
            }

            // Yellow cards (2-4 per match)
            const yellowCount = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < yellowCount; i++) {
                const teamId = Math.random() > 0.5 ? match.home_team_id : match.away_team_id;
                const player = await query<{ season_player_id: number }>(`
          SELECT TOP 1 season_player_id FROM season_player_registrations
          WHERE season_team_id = @teamId ORDER BY NEWID()
        `, { teamId });

                if (player.recordset.length > 0) {
                    await query(`
            INSERT INTO match_events
            (match_id, season_id, season_team_id, season_player_id, ruleset_id,
             event_type, event_minute, card_type)
            VALUES (@matchId, @seasonId, @teamId, @playerId, @rulesetId,
              'CARD', @minute, 'YELLOW')
          `, {
                        matchId: match.match_id,
                        seasonId,
                        teamId,
                        playerId: player.recordset[0].season_player_id,
                        rulesetId,
                        minute: Math.floor(Math.random() * 90) + 1
                    });
                    cardsCreated++;
                }
            }
        }

        console.log(`  ✅ Created ${goalsCreated} goals, ${assistsCreated} assists, ${cardsCreated} cards\n`);

        // Update standings
        console.log('📊 Updating standings...');

        await query('DELETE FROM season_team_statistics WHERE season_id = @seasonId', { seasonId });

        await query(`
      INSERT INTO season_team_statistics
        (season_id, season_team_id, matches_played, wins, draws, losses,
         goals_for, goals_against, points, current_rank)
      SELECT
        @seasonId,
        stp.season_team_id,
        COUNT(DISTINCT m.match_id),
        SUM(CASE
          WHEN m.home_season_team_id = stp.season_team_id AND m.home_score > m.away_score THEN 1
          WHEN m.away_season_team_id = stp.season_team_id AND m.away_score > m.home_score THEN 1
          ELSE 0
        END),
        SUM(CASE
          WHEN (m.home_season_team_id = stp.season_team_id OR m.away_season_team_id = stp.season_team_id)
          AND m.home_score = m.away_score THEN 1
          ELSE 0
        END),
        SUM(CASE
          WHEN m.home_season_team_id = stp.season_team_id AND m.home_score < m.away_score THEN 1
          WHEN m.away_season_team_id = stp.season_team_id AND m.away_score < m.home_score THEN 1
          ELSE 0
        END),
        SUM(CASE
          WHEN m.home_season_team_id = stp.season_team_id THEN m.home_score
          WHEN m.away_season_team_id = stp.season_team_id THEN m.away_score
          ELSE 0
        END),
        SUM(CASE
          WHEN m.home_season_team_id = stp.season_team_id THEN m.away_score
          WHEN m.away_season_team_id = stp.season_team_id THEN m.home_score
          ELSE 0
        END),
        SUM(CASE
          WHEN m.home_season_team_id = stp.season_team_id AND m.home_score > m.away_score THEN 3
          WHEN m.away_season_team_id = stp.season_team_id AND m.away_score > m.home_score THEN 3
          WHEN (m.home_season_team_id = stp.season_team_id OR m.away_season_team_id = stp.season_team_id)
          AND m.home_score = m.away_score THEN 1
          ELSE 0
        END),
        NULL
      FROM season_team_participants stp
      LEFT JOIN matches m ON (m.home_season_team_id = stp.season_team_id
                          OR m.away_season_team_id = stp.season_team_id)
        AND m.season_id = @seasonId AND m.status = 'completed'
      WHERE stp.season_id = @seasonId
      GROUP BY stp.season_team_id
    `, { seasonId });

        await query(`
      WITH RankedTeams AS (
        SELECT season_team_id,
          ROW_NUMBER() OVER (ORDER BY points DESC, goal_difference DESC, goals_for DESC) AS rank_num
        FROM season_team_statistics
        WHERE season_id = @seasonId
      )
      UPDATE sts
      SET current_rank = rt.rank_num
      FROM season_team_statistics sts
      INNER JOIN RankedTeams rt ON sts.season_team_id = rt.season_team_id
      WHERE sts.season_id = @seasonId
    `, { seasonId });

        console.log('  ✅ Standings updated\n');

        // Final summary
        const final = await query(`
      SELECT
        (SELECT COUNT(*) FROM matches WHERE season_id = @seasonId) as total_matches,
        (SELECT COUNT(*) FROM match_events WHERE season_id = @seasonId AND event_type = 'GOAL') as total_goals,
        (SELECT COUNT(*) FROM match_events WHERE season_id = @seasonId AND event_type = 'ASSIST') as total_assists,
        (SELECT COUNT(*) FROM match_events WHERE season_id = @seasonId AND event_type = 'CARD') as total_cards
    `, { seasonId });

        console.log('='.repeat(50));
        console.log('✅ SEASON 2024 DATA COMPLETE!');
        console.log('='.repeat(50));
        console.log('\n📊 Final Summary:');
        console.table(final.recordset);

        console.log('\n🎉 Done! Check the admin portal to view Season 2024 data.\n');

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        throw error;
    }
}

seedMatches2024()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
