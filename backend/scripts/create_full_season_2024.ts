/**
 * Create Complete Season 2024 with 10 Teams + Full Statistics
 */

import { query } from '../src/db/sqlServer';

async function createFullSeason2024() {
    try {
        const seasonId = 10;

        console.log('🏆 Setting up Season 2024 with 10 teams\n');
        console.log('='.repeat(60));

        // Step 1: Clean existing data
        console.log('\n🗑️  Cleaning existing data...');
        await query('DELETE FROM match_events WHERE season_id = @seasonId', { seasonId });
        await query('DELETE FROM matches WHERE season_id = @seasonId', { seasonId });
        await query('DELETE FROM season_team_statistics WHERE season_id = @seasonId', { seasonId });
        await query('DELETE FROM season_player_registrations WHERE season_id = @seasonId', { seasonId });
        await query('DELETE FROM season_team_participants WHERE season_id = @seasonId', { seasonId });
        await query('DELETE FROM season_team_registrations WHERE season_id = @seasonId', { seasonId });
        console.log('✅ Cleaned');

        // Step 2: Select top 10 teams
        console.log('\n📋 Selecting 10 teams...');
        const allTeams = await query<{ team_id: number; name: string }>(`
      SELECT TOP 10 team_id, name
      FROM teams
      WHERE status = 'active'
      ORDER BY team_id
    `);

        console.log('Selected teams:');
        allTeams.recordset.forEach((t, i) => console.log(`  ${i + 1}. ${t.name}`));

        // Step 3: Register teams
        console.log('\n📝 Registering teams for Season 2024...');
        for (const team of allTeams.recordset) {
            await query(`
        INSERT INTO season_team_registrations 
        (season_id, team_id, fee_status, registration_status, home_stadium_name,
         home_stadium_capacity, home_stadium_rating, squad_size, foreign_player_count)
        VALUES (@seasonId, @teamId, 'paid', 'approved', N'Stadium', 20000, 3, 22, 3)
      `, { seasonId, teamId: team.team_id });
        }

        // Get registrations with IDs
        const registrations = await query<{ team_id: number; registration_id: number }>(`
      SELECT team_id, registration_id FROM season_team_registrations WHERE season_id = @seasonId
    `, { seasonId });

        // Create participants
        for (let i = 0; i < registrations.recordset.length; i++) {
            const reg = registrations.recordset[i];
            await query(`
        INSERT INTO season_team_participants (season_id, team_id, registration_id, seed_number, status)
        VALUES (@seasonId, @teamId, @registrationId, @seed, 'active')
      `, {
                seasonId,
                teamId: reg.team_id,
                registrationId: reg.registration_id,
                seed: i + 1
            });
        }
        console.log('✅ 10 teams registered');

        // Step 4: Register players
        console.log('\n👥 Registering players...');
        await query(`
      INSERT INTO season_player_registrations 
        (season_id, season_team_id, player_id, registration_status, player_type, 
         is_foreign, shirt_number, position_code, age_on_season_start)
      SELECT 
        @seasonId,
        stp.season_team_id,
        p.player_id,
        'approved',
        'domestic',
        0,
        ROW_NUMBER() OVER (PARTITION BY stp.season_team_id ORDER BY p.player_id),
        p.preferred_position,
        22
      FROM players p
      JOIN season_team_participants stp ON stp.team_id = p.current_team_id
      WHERE stp.season_id = @seasonId
    `, { seasonId });

        const playerCount = await query('SELECT COUNT(*) as cnt FROM season_player_registrations WHERE season_id = @seasonId', { seasonId });
        console.log(`✅ ${playerCount.recordset[0].cnt} players registered`);

        // Step 5: Create 18 rounds
        console.log('\n🔢 Creating 18 rounds...');
        for (let i = 1; i <= 18; i++) {
            await query(`
        DELETE FROM season_rounds WHERE season_id = @seasonId AND round_number = @round
      `, { seasonId, round: i });

            await query(`
        INSERT INTO season_rounds (season_id, round_number, name, start_date, end_date, status)
        VALUES (@seasonId, @round, N'Vòng ' + CAST(@round AS NVARCHAR),
          DATEADD(WEEK, @round - 1, '2024-02-01'),
          DATEADD(WEEK, @round - 1, '2024-02-07'),
          'completed')
      `, { seasonId, round: i });
        }
        console.log('✅ 18 rounds created');

        // Step 6: Create matches
        console.log('\n⚽ Creating matches (9 per round × 18 rounds = 162 matches)...');

        const teams = await query<{ season_team_id: number; stadium_id: number; seq: number }>(`
      SELECT 
        stp.season_team_id,
        ISNULL(t.home_stadium_id, (SELECT TOP 1 stadium_id FROM stadiums)) as stadium_id,
        ROW_NUMBER() OVER (ORDER BY stp.season_team_id) as seq
      FROM season_team_participants stp
      JOIN teams t ON t.team_id = stp.team_id
      WHERE stp.season_id = @seasonId
    `, { seasonId });

        const getRuleset = await query<{ ruleset_id: number }>('SELECT TOP 1 ruleset_id FROM rulesets WHERE is_active = 1');
        const rulesetId = getRuleset.recordset[0].ruleset_id;

        let matchesCreated = 0;

        for (let round = 1; round <= 18; round++) {
            const roundResult = await query<{ round_id: number }>(`
        SELECT round_id FROM season_rounds WHERE season_id = @seasonId AND round_number = @round
      `, { seasonId, round });

            const roundId = roundResult.recordset[0].round_id;

            // 10 teams = 5 matches per round (round robin)
            for (let matchNum = 1; matchNum <= 5; matchNum++) {
                let homeSeq = matchNum;
                let awaySeq = 11 - matchNum;

                // Reverse for second leg (rounds 10-18)
                if (round > 9) {
                    homeSeq = 11 - matchNum;
                    awaySeq = matchNum;
                }

                const homeTeam = teams.recordset.find(t => t.seq === homeSeq);
                const awayTeam = teams.recordset.find(t => t.seq === awaySeq);

                if (!homeTeam || !awayTeam) continue;

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
                    kickoff: `2024-${String(Math.floor((round - 1) / 4) + 2).padStart(2, '0')}-${String(((round - 1) % 7) * 4 + 1).padStart(2, '0')}T19:00:00`,
                    homeScore,
                    awayScore
                });

                matchesCreated++;
            }
        }

        console.log(`✅ Created ${matchesCreated} matches`);

        // Step 7: Create match events (goals, assists, cards)
        console.log('\n🎯 Creating match events...');

        const matches = await query<{
            match_id: number;
            home_score: number;
            away_score: number;
            home_team_id: number;
            away_team_id: number;
        }>(`
      SELECT match_id, ISNULL(home_score, 0) as home_score, ISNULL(away_score, 0) as away_score,
        home_season_team_id as home_team_id, away_season_team_id as away_team_id
      FROM matches WHERE season_id = @seasonId
    `, { seasonId });

        let goalsCreated = 0, assistsCreated = 0, yellowCards = 0, redCards = 0;

        for (const match of matches.recordset) {
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

            // Yellow cards (2-5 per match)
            const yellowCount = 2 + Math.floor(Math.random() * 4);
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
                    yellowCards++;
                }
            }

            // Red cards (15% chance per match)
            if (Math.random() < 0.15) {
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
              'CARD', @minute, 'RED')
          `, {
                        matchId: match.match_id,
                        seasonId,
                        teamId,
                        playerId: player.recordset[0].season_player_id,
                        rulesetId,
                        minute: Math.floor(Math.random() * 90) + 1
                    });
                    redCards++;
                }
            }
        }

        console.log(`✅ Created ${goalsCreated} goals, ${assistsCreated} assists`);
        console.log(`✅ Created ${yellowCards} yellow cards, ${redCards} red cards`);

        // Step 8: Update standings
        console.log('\n📊 Calculating standings...');

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

        console.log('✅ Standings calculated');

        // Final summary
        console.log('\n' + '='.repeat(60));
        console.log('✅ SEASON 2024 SETUP COMPLETE!');
        console.log('='.repeat(60));

        const summary = await query(`
      SELECT
        (SELECT COUNT(*) FROM season_team_participants WHERE season_id = @seasonId) as teams,
        (SELECT COUNT(*) FROM season_player_registrations WHERE season_id = @seasonId) as players,
        (SELECT COUNT(*) FROM matches WHERE season_id = @seasonId) as matches,
        (SELECT COUNT(*) FROM match_events WHERE season_id = @seasonId AND event_type = 'GOAL') as goals,
        (SELECT COUNT(*) FROM match_events WHERE season_id = @seasonId AND event_type = 'ASSIST') as assists,
        (SELECT COUNT(*) FROM match_events WHERE season_id = @seasonId AND event_type = 'CARD' AND card_type = 'YELLOW') as yellow_cards,
        (SELECT COUNT(*) FROM match_events WHERE season_id = @seasonId AND event_type = 'CARD' AND card_type = 'RED') as red_cards
    `, { seasonId });

        console.log('\n📊 Final Summary:');
        console.table(summary.recordset);

        console.log('\n🎉 You can now view Season 2024 in the admin portal!\n');

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        throw error;
    }
}

createFullSeason2024()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
