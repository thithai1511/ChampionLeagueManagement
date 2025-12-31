/**
 * Seed Data Script - Season 2024 Only
 * Tạo đầy đủ dữ liệu cho mùa giải 2024:
 * - Teams, Players, Matches, Goals, Assists, Cards, Standings
 */

import { query } from '../src/db/sqlServer';

async function seedSeason2024() {
  try {
    console.log('🌱 Starting Season 2024 Data Seeding...\n');

    // ============================================================
    // 1. FIND OR CREATE SEASON 2024
    // ============================================================
    console.log('📅 Finding Season 2024...');

    let season2024Result = await query<{ season_id: number; name: string }>(`
      SELECT TOP 1 season_id, name 
      FROM seasons 
      WHERE (name LIKE N'%2024%' OR code LIKE '%2024%')
      ORDER BY season_id DESC
    `);

    let season2024Id: number;

    if (season2024Result.recordset.length === 0) {
      console.log('  ⚠️ Season 2024 not found. Creating...');

      // Get tournament and ruleset
      const tournament = await query<{ tournament_id: number }>('SELECT TOP 1 tournament_id FROM tournaments');
      const ruleset = await query<{ ruleset_id: number }>('SELECT TOP 1 ruleset_id FROM rulesets WHERE is_active = 1');

      if (tournament.recordset.length === 0 || ruleset.recordset.length === 0) {
        throw new Error('No tournament or ruleset found. Please create them first.');
      }

      const createSeason = await query<{ season_id: number }>(`
        INSERT INTO seasons (tournament_id, ruleset_id, name, code, start_date, end_date, 
          participation_fee, max_teams, expected_rounds, status, created_by)
        OUTPUT INSERTED.season_id
        VALUES (@tournamentId, @rulesetId, N'Mùa Giải 2024', 'SEASON-2024', 
          '2024-01-01', '2024-12-31', 1000000, 10, 18, 'completed', 1)
      `, {
        tournamentId: tournament.recordset[0].tournament_id,
        rulesetId: ruleset.recordset[0].ruleset_id
      });

      season2024Id = createSeason.recordset[0].season_id;
      console.log(`  ✅ Created Season 2024 (ID: ${season2024Id})`);
    } else {
      season2024Id = season2024Result.recordset[0].season_id;
      console.log(`  ✅ Found Season 2024: ${season2024Result.recordset[0].name} (ID: ${season2024Id})`);
    }

    // ============================================================
    // 2. GET ACTIVE TEAMS
    // ============================================================
    console.log('\n🏟️  Getting active teams...');

    const teams = await query<{ team_id: number; name: string; stadium_id: number }>(`
      SELECT TOP 10 team_id, name, ISNULL(home_stadium_id, 
        (SELECT TOP 1 stadium_id FROM stadiums)) as stadium_id
      FROM teams 
      WHERE status = 'active'
      ORDER BY team_id
    `);

    if (teams.recordset.length < 10) {
      throw new Error(`Not enough teams! Need 10, found ${teams.recordset.length}`);
    }

    console.log(`  ✅ Selected ${teams.recordset.length} teams`);

    // ============================================================
    // 3. REGISTER TEAMS FOR SEASON 2024
    // ============================================================
    console.log('\n📝 Registering teams for Season 2024...');

    for (const team of teams.recordset) {
      // Check if already registered
      const existing = await query<{ registration_id: number }>(`
        SELECT registration_id FROM season_team_registrations
        WHERE season_id = @seasonId AND team_id = @teamId
      `, { seasonId: season2024Id, teamId: team.team_id });

      if (existing.recordset.length === 0) {
        await query(`
          INSERT INTO season_team_registrations 
          (season_id, team_id, fee_status, registration_status, home_stadium_name,
           home_stadium_capacity, home_stadium_rating, squad_size, foreign_player_count)
          VALUES (@seasonId, @teamId, 'paid', 'approved', N'Stadium', 20000, 3, 22, 3)
        `, { seasonId: season2024Id, teamId: team.team_id });
        console.log(`  ✅ Registered team: ${team.name}`);
      }
    }

    // Get all registrations with IDs to create participants
    const registrations = await query<{ team_id: number; registration_id: number }>(`
          SELECT team_id, registration_id
          FROM season_team_registrations
          WHERE season_id = @seasonId
        `, { seasonId: season2024Id });

    console.log('\n👥 Creating season team participants...');

    // Create season team participants with proper registration_id
    for (const reg of registrations.recordset) {
      const existing = await query(`
        SELECT 1 FROM season_team_participants
        WHERE season_id = @seasonId AND team_id = @teamId
      `, { seasonId: season2024Id, teamId: reg.team_id });

      if (existing.recordset.length === 0) {
        // Get next seed number
        const maxSeedResult = await query<{ max_seed: number | null }>(`
          SELECT MAX(seed_number) as max_seed
          FROM season_team_participants
          WHERE season_id = @seasonId
        `, { seasonId: season2024Id });

        const nextSeed = (maxSeedResult.recordset[0].max_seed || 0) + 1;

        await query(`
          INSERT INTO season_team_participants 
          (season_id, team_id, registration_id, seed_number, status)
          VALUES (@seasonId, @teamId, @registrationId, @seedNumber, 'active')
        `, {
          seasonId: season2024Id,
          teamId: reg.team_id,
          registrationId: reg.registration_id,
          seedNumber: nextSeed
        });
      }
    }

    console.log('  ✅ Team registrations and participants complete');

    // ============================================================
    // 4. CREATE PLAYERS (22 per team)
    // ============================================================
    console.log('\n⚽ Creating players...');

    const positions = ['GK', 'GK', 'CB', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM',
      'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST', 'ST', 'CB', 'CM', 'ST', 'GK'];

    for (const team of teams.recordset) {
      // Check existing players
      const playerCount = await query<{ cnt: number }>(`
        SELECT COUNT(*) as cnt FROM players WHERE current_team_id = @teamId
      `, { teamId: team.team_id });

      const existing = playerCount.recordset[0].cnt;

      if (existing < 22) {
        for (let i = existing + 1; i <= 22; i++) {
          const playerName = `Cầu thủ ${team.team_id}-${i}`;

          await query(`
            IF NOT EXISTS (SELECT 1 FROM players WHERE full_name = @name)
            INSERT INTO players (full_name, display_name, date_of_birth, nationality, 
              preferred_position, height_cm, weight_kg, dominant_foot, current_team_id, created_by)
            VALUES (@name, @name, DATEADD(YEAR, -20, GETDATE()), N'Việt Nam',
              @position, 175, 70, 'right', @teamId, 1)
          `, {
            name: playerName,
            position: positions[i - 1],
            teamId: team.team_id
          });
        }
      }
    }

    console.log('  ✅ Players created');

    // ============================================================
    // 5. REGISTER PLAYERS FOR SEASON
    // ============================================================
    console.log('\n👥 Registering players for season...');

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
      AND NOT EXISTS (
        SELECT 1 FROM season_player_registrations spr
        WHERE spr.season_id = @seasonId AND spr.player_id = p.player_id
      )
    `, { seasonId: season2024Id });

    console.log('  ✅ Player registrations complete');

    // ============================================================
    // 6. CREATE ROUNDS
    // ============================================================
    console.log('\n🔢 Creating 18 rounds...');

    const seasonStart = new Date('2024-02-01');

    for (let round = 1; round <= 18; round++) {
      const existing = await query(`
        SELECT 1 FROM season_rounds 
        WHERE season_id = @seasonId AND round_number = @round
      `, { seasonId: season2024Id, round });

      if (existing.recordset.length === 0) {
        const roundDate = new Date(seasonStart);
        roundDate.setDate(roundDate.getDate() + (round - 1) * 7);

        await query(`
          INSERT INTO season_rounds (season_id, round_number, name, start_date, end_date, status)
          VALUES (@seasonId, @round, N'Vòng ' + CAST(@round AS NVARCHAR), 
            @startDate, DATEADD(DAY, 6, @startDate), 'completed')
        `, {
          seasonId: season2024Id,
          round,
          startDate: roundDate.toISOString().split('T')[0]
        });
      }
    }

    console.log('  ✅ Rounds created');

    // ============================================================
    // 7. CREATE MATCHES
    // ============================================================
    console.log('\n⚽ Creating matches with results...');

    const seasonTeams = await query<{ season_team_id: number; stadium_id: number; seq: number }>(`
      SELECT season_team_id, 
        ISNULL(t.home_stadium_id, (SELECT TOP 1 stadium_id FROM stadiums)) as stadium_id,
        ROW_NUMBER() OVER (ORDER BY stp.season_team_id) as seq
      FROM season_team_participants stp
      JOIN teams t ON t.team_id = stp.team_id
      WHERE stp.season_id = @seasonId
    `, { seasonId: season2024Id });

    const getRuleset = await query<{ ruleset_id: number }>('SELECT TOP 1 ruleset_id FROM rulesets WHERE is_active = 1');
    const rulesetId = getRuleset.recordset[0].ruleset_id;

    let matchesCreated = 0;

    for (let round = 1; round <= 18; round++) {
      const roundResult = await query<{ round_id: number }>(`
        SELECT round_id FROM season_rounds 
        WHERE season_id = @seasonId AND round_number = @round
      `, { seasonId: season2024Id, round });

      if (roundResult.recordset.length === 0) continue;

      const roundId = roundResult.recordset[0].round_id;
      const roundDate = new Date('2024-02-01');
      roundDate.setDate(roundDate.getDate() + (round - 1) * 7);

      // Create 5 matches per round (10 teams = 5 pairs)
      for (let matchNum = 1; matchNum <= 5; matchNum++) {
        let homeSeq = matchNum;
        let awaySeq = 11 - matchNum;

        // Reverse for second leg
        if (round > 9) {
          homeSeq = 11 - matchNum;
          awaySeq = matchNum;
        }

        const homeTeam = seasonTeams.recordset.find(t => t.seq === homeSeq);
        const awayTeam = seasonTeams.recordset.find(t => t.seq === awaySeq);

        if (!homeTeam || !awayTeam) continue;

        // Random scores
        const homeScore = Math.floor(Math.random() * 5);
        const awayScore = Math.floor(Math.random() * 4);

        // Check if match exists
        const existing = await query(`
          SELECT 1 FROM matches 
          WHERE season_id = @seasonId AND round_id = @roundId
            AND home_season_team_id = @homeTeamId AND away_season_team_id = @awayTeamId
        `, {
          seasonId: season2024Id,
          roundId,
          homeTeamId: homeTeam.season_team_id,
          awayTeamId: awayTeam.season_team_id
        });

        if (existing.recordset.length === 0) {
          const kickoff = new Date(roundDate);
          kickoff.setHours(19 + matchNum - 1);

          await query(`
            INSERT INTO matches 
            (season_id, round_id, matchday_number, home_season_team_id, away_season_team_id,
             stadium_id, ruleset_id, scheduled_kickoff, status, home_score, away_score, attendance)
            VALUES (@seasonId, @roundId, @round, @homeTeamId, @awayTeamId,
              @stadiumId, @rulesetId, @kickoff, 'completed', @homeScore, @awayScore, 15000)
          `, {
            seasonId: season2024Id,
            roundId,
            round,
            homeTeamId: homeTeam.season_team_id,
            awayTeamId: awayTeam.season_team_id,
            stadiumId: homeTeam.stadium_id,
            rulesetId,
            kickoff: kickoff.toISOString(),
            homeScore,
            awayScore
          });

          matchesCreated++;
        }
      }
    }

    console.log(`  ✅ Created ${matchesCreated} matches`);

    // ============================================================
    // 8. CREATE MATCH EVENTS (Goals, Assists, Cards)
    // ============================================================
    console.log('\n🎯 Creating match events (goals, assists, cards)...');

    const matches = await query<{
      match_id: number;
      home_score: number;
      away_score: number;
      home_team_id: number;
      away_team_id: number;
    }>(`
      SELECT match_id, ISNULL(home_score, 0) as home_score, ISNULL(away_score, 0) as away_score,
        home_season_team_id as home_team_id, away_season_team_id as away_team_id
      FROM matches
      WHERE season_id = @seasonId AND status = 'completed'
    `, { seasonId: season2024Id });

    let goalsCreated = 0;
    let assistsCreated = 0;
    let cardsCreated = 0;

    for (const match of matches.recordset) {
      // Check if events already exist
      const hasEvents = await query(`
        SELECT 1 FROM match_events WHERE match_id = @matchId
      `, { matchId: match.match_id });

      if (hasEvents.recordset.length > 0) continue;

      // Create home team goals
      for (let i = 0; i < match.home_score; i++) {
        const scorer = await query<{ season_player_id: number }>(`
          SELECT TOP 1 season_player_id FROM season_player_registrations
          WHERE season_team_id = @teamId AND position_code != 'GK'
          ORDER BY NEWID()
        `, { teamId: match.home_team_id });

        if (scorer.recordset.length > 0) {
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
            seasonId: season2024Id,
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
              seasonId: season2024Id,
              teamId: match.home_team_id,
              assistId: assist.recordset[0].season_player_id,
              scorerId: scorer.recordset[0].season_player_id,
              rulesetId,
              minute: Math.floor(Math.random() * 90) + 1
            });
            assistsCreated++;
          }
        }
      }

      // Create away team goals
      for (let i = 0; i < match.away_score; i++) {
        const scorer = await query<{ season_player_id: number }>(`
          SELECT TOP 1 season_player_id FROM season_player_registrations
          WHERE season_team_id = @teamId AND position_code != 'GK'
          ORDER BY NEWID()
        `, { teamId: match.away_team_id });

        if (scorer.recordset.length > 0) {
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
            seasonId: season2024Id,
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
              seasonId: season2024Id,
              teamId: match.away_team_id,
              assistId: assist.recordset[0].season_player_id,
              scorerId: scorer.recordset[0].season_player_id,
              rulesetId,
              minute: Math.floor(Math.random() * 90) + 1
            });
            assistsCreated++;
          }
        }
      }

      // Yellow cards (0-4 per match)
      const yellowCount = Math.floor(Math.random() * 5);
      for (let i = 0; i < yellowCount; i++) {
        const teamId = Math.random() > 0.5 ? match.home_team_id : match.away_team_id;
        const cardPlayer = await query<{ season_player_id: number }>(`
          SELECT TOP 1 season_player_id FROM season_player_registrations
          WHERE season_team_id = @teamId ORDER BY NEWID()
        `, { teamId });

        if (cardPlayer.recordset.length > 0) {
          await query(`
            INSERT INTO match_events 
            (match_id, season_id, season_team_id, season_player_id, ruleset_id,
             event_type, event_minute, card_type)
            VALUES (@matchId, @seasonId, @teamId, @playerId, @rulesetId,
              'CARD', @minute, 'YELLOW')
          `, {
            matchId: match.match_id,
            seasonId: season2024Id,
            teamId,
            playerId: cardPlayer.recordset[0].season_player_id,
            rulesetId,
            minute: Math.floor(Math.random() * 90) + 1
          });
          cardsCreated++;
        }
      }

      // Red card (10% chance)
      if (Math.random() < 0.1) {
        const teamId = Math.random() > 0.5 ? match.home_team_id : match.away_team_id;
        const cardPlayer = await query<{ season_player_id: number }>(`
          SELECT TOP 1 season_player_id FROM season_player_registrations
          WHERE season_team_id = @teamId ORDER BY NEWID()
        `, { teamId });

        if (cardPlayer.recordset.length > 0) {
          await query(`
            INSERT INTO match_events 
            (match_id, season_id, season_team_id, season_player_id, ruleset_id,
             event_type, event_minute, card_type)
            VALUES (@matchId, @seasonId, @teamId, @playerId, @rulesetId,
              'CARD', @minute, 'RED')
          `, {
            matchId: match.match_id,
            seasonId: season2024Id,
            teamId,
            playerId: cardPlayer.recordset[0].season_player_id,
            rulesetId,
            minute: Math.floor(Math.random() * 90) + 1
          });
          cardsCreated++;
        }
      }
    }

    console.log(`  ✅ Created ${goalsCreated} goals, ${assistsCreated} assists, ${cardsCreated} cards`);

    // ============================================================
    // 9. CREATE STANDINGS
    // ============================================================
    console.log('\n📊 Calculating standings...');

    await query(`
      DELETE FROM season_team_statistics WHERE season_id = @seasonId
    `, { seasonId: season2024Id });

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
    `, { seasonId: season2024Id });

    // Update ranks
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
    `, { seasonId: season2024Id });

    console.log('  ✅ Standings calculated');

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(50));
    console.log('✅ SEASON 2024 DATA SEEDING COMPLETE!');
    console.log('='.repeat(50));

    const summary = await query<{ Entity: string; Count: number }>(`
      SELECT 'Teams' as Entity, COUNT(*) as Count 
      FROM season_team_participants WHERE season_id = @seasonId
      UNION ALL SELECT 'Players', COUNT(*) 
      FROM season_player_registrations WHERE season_id = @seasonId
      UNION ALL SELECT 'Matches', COUNT(*) 
      FROM matches WHERE season_id = @seasonId
      UNION ALL SELECT 'Goals', COUNT(*) 
      FROM match_events WHERE season_id = @seasonId AND event_type = 'GOAL'
      UNION ALL SELECT 'Assists', COUNT(*) 
      FROM match_events WHERE season_id = @seasonId AND event_type = 'ASSIST'
      UNION ALL SELECT 'Yellow Cards', COUNT(*) 
      FROM match_events WHERE season_id = @seasonId AND event_type = 'CARD' AND card_type = 'YELLOW'
      UNION ALL SELECT 'Red Cards', COUNT(*) 
      FROM match_events WHERE season_id = @seasonId AND event_type = 'CARD' AND card_type = 'RED'
    `, { seasonId: season2024Id });

    console.log('\n📊 Summary:');
    console.table(summary.recordset);

    console.log('\n🎉 All done! You can now view Season 2024 data in the admin portal.\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run the script
seedSeason2024()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
