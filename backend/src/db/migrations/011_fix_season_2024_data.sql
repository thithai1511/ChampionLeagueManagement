USE ChampionLeagueManagement;
GO
/*
  Migration: Fix Season 2024 Data
  Purpose: Ensure Season 2024 has complete data (matches, events, standings)
  Date: 2025-12-29
*/

SET NOCOUNT ON;
PRINT '=== Fixing Season 2024 Data ===';

-- ============================================================
-- FIND SEASON 2024
-- ============================================================

DECLARE @season2024Id INT;
SELECT TOP 1 @season2024Id = season_id 
FROM seasons 
WHERE (name LIKE N'%2024%' OR code LIKE '%2024%')
ORDER BY season_id DESC;

IF @season2024Id IS NULL
BEGIN
    PRINT 'ERROR: Season 2024 not found.';
    RETURN;
END

PRINT 'Found Season 2024, ID: ' + CAST(@season2024Id AS VARCHAR(10));

-- ============================================================
-- CHECK CURRENT DATA
-- ============================================================

DECLARE @teamCount INT, @playerCount INT, @matchCount INT, @eventCount INT, @standingsCount INT;
DECLARE @roundsCount INT;

SELECT @teamCount = COUNT(*) FROM season_team_participants WHERE season_id = @season2024Id;
SELECT @playerCount = COUNT(*) FROM season_player_registrations WHERE season_id = @season2024Id;
SELECT @matchCount = COUNT(*) FROM matches WHERE season_id = @season2024Id AND status = 'completed';
SELECT @eventCount = COUNT(*) FROM match_events WHERE season_id = @season2024Id;
SELECT @standingsCount = COUNT(*) FROM season_team_statistics WHERE season_id = @season2024Id;
SELECT @roundsCount = COUNT(*) FROM season_rounds WHERE season_id = @season2024Id;

PRINT 'Current data for Season 2024:';
PRINT '  Teams: ' + CAST(@teamCount AS VARCHAR(10));
PRINT '  Players: ' + CAST(@playerCount AS VARCHAR(10));
PRINT '  Matches: ' + CAST(@matchCount AS VARCHAR(10));
PRINT '  Events: ' + CAST(@eventCount AS VARCHAR(10));
PRINT '  Standings: ' + CAST(@standingsCount AS VARCHAR(10));

-- ============================================================
-- SETUP VARIABLES
-- ============================================================

DECLARE @rulesetId INT;
DECLARE @adminUserId INT = 1;
DECLARE @defaultStadiumId INT;

SELECT TOP 1 @rulesetId = ruleset_id FROM rulesets WHERE is_active = 1;
SELECT TOP 1 @defaultStadiumId = stadium_id FROM stadiums;

IF @rulesetId IS NULL OR @defaultStadiumId IS NULL
BEGIN
    PRINT 'ERROR: Missing ruleset or stadium.';
    RETURN;
END

-- Get season start date
DECLARE @season2024Start DATE;
SELECT @season2024Start = start_date FROM seasons WHERE season_id = @season2024Id;

-- ============================================================
-- ENSURE 10 TEAMS ARE REGISTERED
-- ============================================================

PRINT '--- Ensuring 10 teams are registered ---';

DECLARE @selectedTeams TABLE (idx INT IDENTITY(1,1), team_id INT, team_name NVARCHAR(255), stadium_id INT);
INSERT INTO @selectedTeams (team_id, team_name, stadium_id)
SELECT TOP 10 t.team_id, t.name, ISNULL(t.home_stadium_id, @defaultStadiumId)
FROM teams t
WHERE t.status = 'active'
ORDER BY t.team_id;

-- Register teams if not registered
INSERT INTO season_team_registrations (season_id, team_id, fee_status, registration_status,
    home_stadium_name, home_stadium_capacity, home_stadium_rating, squad_size, foreign_player_count)
SELECT @season2024Id, st.team_id, 'paid', 'approved',
    ISNULL(s.name, N'Default Stadium'), ISNULL(s.capacity, 20000), 3, 22, 3
FROM @selectedTeams st
LEFT JOIN stadiums s ON s.stadium_id = st.stadium_id
WHERE NOT EXISTS (
    SELECT 1 FROM season_team_registrations 
    WHERE season_id = @season2024Id AND team_id = st.team_id
);

-- Create participants if not exist
INSERT INTO season_team_participants (season_id, team_id, registration_id, seed_number, status)
SELECT @season2024Id, r.team_id, r.registration_id, ROW_NUMBER() OVER (ORDER BY r.team_id), 'active'
FROM season_team_registrations r
WHERE r.season_id = @season2024Id
AND NOT EXISTS (
    SELECT 1 FROM season_team_participants 
    WHERE season_id = @season2024Id AND team_id = r.team_id
);

SELECT @teamCount = COUNT(*) FROM season_team_participants WHERE season_id = @season2024Id;
PRINT 'Teams registered: ' + CAST(@teamCount AS VARCHAR(10));

-- ============================================================
-- ENSURE PLAYERS ARE REGISTERED
-- ============================================================

PRINT '--- Ensuring players are registered ---';

-- Get team participants (only first 10 teams for matches)
DECLARE @teams2024 TABLE (seq INT, season_team_id INT, team_id INT, stadium_id INT);
INSERT INTO @teams2024 (seq, season_team_id, team_id, stadium_id)
SELECT TOP 10 ROW_NUMBER() OVER (ORDER BY stp.season_team_id), stp.season_team_id, stp.team_id,
       ISNULL(t.home_stadium_id, @defaultStadiumId)
FROM season_team_participants stp
JOIN teams t ON t.team_id = stp.team_id
WHERE stp.season_id = @season2024Id
ORDER BY stp.season_team_id;

DECLARE @teamCount2024 INT;
SELECT @teamCount2024 = COUNT(*) FROM @teams2024;
PRINT 'Teams selected for matches: ' + CAST(@teamCount2024 AS VARCHAR(10));

-- Register players for each team
DECLARE @teamId INT, @seasonTeamId INT, @maxShirtNum INT;
DECLARE team_cursor CURSOR FOR SELECT team_id, season_team_id FROM @teams2024;
OPEN team_cursor;
FETCH NEXT FROM team_cursor INTO @teamId, @seasonTeamId;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Register players if not registered
    SELECT @maxShirtNum = ISNULL(MAX(shirt_number), 0) FROM season_player_registrations WHERE season_team_id = @seasonTeamId;
    
    ;WITH PlayerRegistrations AS (
        SELECT 
            p.player_id,
            p.preferred_position,
            p.date_of_birth,
            DATEDIFF(YEAR, p.date_of_birth, @season2024Start) AS age,
            ROW_NUMBER() OVER (ORDER BY p.player_id) AS rn
        FROM players p
        WHERE p.current_team_id = @teamId
        AND DATEDIFF(YEAR, p.date_of_birth, @season2024Start) BETWEEN 16 AND 40
        AND NOT EXISTS (
            SELECT 1 FROM season_player_registrations spr 
            WHERE spr.season_id = @season2024Id AND spr.player_id = p.player_id
        )
    )
    INSERT INTO season_player_registrations (season_id, season_team_id, player_id, registration_status,
        player_type, is_foreign, shirt_number, position_code, age_on_season_start)
    SELECT @season2024Id, @seasonTeamId, player_id, 'approved', 'domestic', 0,
        CASE 
            WHEN @maxShirtNum + rn > 99 THEN ((@maxShirtNum + rn - 1) % 99) + 1
            ELSE @maxShirtNum + rn
        END,
        preferred_position, age
    FROM PlayerRegistrations;
    
    FETCH NEXT FROM team_cursor INTO @teamId, @seasonTeamId;
END
CLOSE team_cursor;
DEALLOCATE team_cursor;

SELECT @playerCount = COUNT(*) FROM season_player_registrations WHERE season_id = @season2024Id;
PRINT 'Players registered: ' + CAST(@playerCount AS VARCHAR(10));

-- ============================================================
-- ENSURE SEASON ROUNDS EXIST
-- ============================================================

PRINT '--- Ensuring season rounds exist ---';

DECLARE @roundNum INT = 1;
DECLARE @roundDate DATE = DATEADD(DAY, 15, @season2024Start);

WHILE @roundNum <= 18
BEGIN
    IF NOT EXISTS (SELECT 1 FROM season_rounds WHERE season_id = @season2024Id AND round_number = @roundNum)
    BEGIN
        INSERT INTO season_rounds (season_id, round_number, name, start_date, end_date, status)
        VALUES (@season2024Id, @roundNum, N'Vòng ' + CAST(@roundNum AS NVARCHAR(10)),
                @roundDate, DATEADD(DAY, 6, @roundDate), 'completed');
    END
    SET @roundDate = DATEADD(WEEK, 1, @roundDate);
    SET @roundNum = @roundNum + 1;
END

SELECT @roundsCount = COUNT(*) FROM season_rounds WHERE season_id = @season2024Id;
PRINT 'Season rounds: ' + CAST(@roundsCount AS VARCHAR(10));

-- ============================================================
-- CREATE MATCHES FOR SEASON 2024
-- ============================================================

PRINT '--- Creating matches for Season 2024 ---';

-- Check if we have enough teams
DECLARE @teamCountForMatches INT;
SELECT @teamCountForMatches = COUNT(*) FROM @teams2024;

IF @teamCountForMatches < 10
BEGIN
    PRINT 'ERROR: Need at least 10 teams to create matches. Current: ' + CAST(@teamCountForMatches AS VARCHAR(10));
    RETURN;
END

-- Delete existing matches first to recreate them
-- Must delete dependent data first to avoid FK constraints
DELETE FROM player_suspensions WHERE trigger_match_id IN (SELECT match_id FROM matches WHERE season_id = @season2024Id) OR cleared_match_id IN (SELECT match_id FROM matches WHERE season_id = @season2024Id);
DELETE FROM player_of_match WHERE match_id IN (SELECT match_id FROM matches WHERE season_id = @season2024Id);
DELETE FROM match_events WHERE match_id IN (SELECT match_id FROM matches WHERE season_id = @season2024Id);
DELETE FROM matches WHERE season_id = @season2024Id;
PRINT 'Deleted existing matches and dependent data for Season 2024';

-- Check rounds
SELECT @roundsCount = COUNT(*) FROM season_rounds WHERE season_id = @season2024Id;
PRINT 'Total rounds available: ' + CAST(@roundsCount AS VARCHAR(10));

DECLARE @round INT = 1;
DECLARE @roundId INT;
DECLARE @homeTeamId INT, @awayTeamId INT, @stadiumId INT;
DECLARE @homeScore INT, @awayScore INT;
DECLARE @kickoff DATETIME2;
DECLARE @matchNum INT;
DECLARE @matchesCreated INT = 0;
DECLARE @homeSeq INT, @awaySeq INT;

SET @round = 1;
WHILE @round <= 18
BEGIN
    SELECT @roundId = round_id FROM season_rounds WHERE season_id = @season2024Id AND round_number = @round;
    
    IF @roundId IS NULL
    BEGIN
        PRINT 'WARNING: Round ' + CAST(@round AS VARCHAR(10)) + ' not found. Skipping.';
    END
    ELSE
    BEGIN
        SET @kickoff = DATEADD(DAY, (@round - 1) * 7, CAST(@season2024Start AS DATETIME2));
        SET @kickoff = DATEADD(DAY, 15, @kickoff);
        SET @kickoff = DATEADD(HOUR, 19, CAST(CAST(@kickoff AS DATE) AS DATETIME2));
        
        SET @matchNum = 1;
        WHILE @matchNum <= 5
        BEGIN
            SET @homeSeq = @matchNum;
            SET @awaySeq = 11 - @matchNum;
            
            -- Swap home/away for second half of season
            IF @round > 9
            BEGIN
                SET @homeSeq = 11 - @matchNum;
                SET @awaySeq = @matchNum;
            END
            
            SELECT @homeTeamId = season_team_id, @stadiumId = stadium_id FROM @teams2024 WHERE seq = @homeSeq;
            SELECT @awayTeamId = season_team_id FROM @teams2024 WHERE seq = @awaySeq;
            
            IF @homeTeamId IS NULL OR @awayTeamId IS NULL
            BEGIN
                PRINT 'WARNING: Missing team for Round ' + CAST(@round AS VARCHAR(10)) + ', Match ' + CAST(@matchNum AS VARCHAR(10)) + 
                      ' (HomeSeq: ' + CAST(@homeSeq AS VARCHAR(10)) + ', AwaySeq: ' + CAST(@awaySeq AS VARCHAR(10)) + ')';
            END
            ELSE IF @stadiumId IS NULL
            BEGIN
                SET @stadiumId = @defaultStadiumId;
                PRINT 'WARNING: Stadium ID is NULL for Round ' + CAST(@round AS VARCHAR(10)) + ', Match ' + CAST(@matchNum AS VARCHAR(10)) + ', using default';
            END
            
            IF @homeTeamId IS NOT NULL AND @awayTeamId IS NOT NULL AND @roundId IS NOT NULL AND @stadiumId IS NOT NULL
            BEGIN
                -- Higher scoring: 1-8 goals for home, 0-6 for away
                SET @homeScore = 1 + (ABS(CHECKSUM(NEWID())) % 8);  -- 1-8 goals (min 1)
                SET @awayScore = ABS(CHECKSUM(NEWID())) % 7;  -- 0-6 goals
                
                BEGIN TRY
                    INSERT INTO matches (season_id, round_id, matchday_number, home_season_team_id, away_season_team_id,
                        stadium_id, ruleset_id, scheduled_kickoff, status, home_score, away_score, attendance, match_code)
                    VALUES (@season2024Id, @roundId, @round, @homeTeamId, @awayTeamId,
                        @stadiumId, @rulesetId, DATEADD(HOUR, @matchNum - 1, @kickoff), 'completed',
                        @homeScore, @awayScore, 10000 + ABS(CHECKSUM(NEWID())) % 15000,
                        'S' + CAST(@season2024Id AS VARCHAR(10)) + '-R' + CAST(@round AS VARCHAR(10)) + '-M' + CAST(@matchNum AS VARCHAR(10)));
                    SET @matchesCreated = @matchesCreated + 1;
                END TRY
                BEGIN CATCH
                    PRINT 'ERROR creating match Round ' + CAST(@round AS VARCHAR(10)) + ', Match ' + CAST(@matchNum AS VARCHAR(10)) + 
                          ': ' + ERROR_MESSAGE();
                END CATCH
            END
            
            SET @matchNum = @matchNum + 1;
        END
        
        IF @round % 3 = 0
            PRINT 'Processed ' + CAST(@round AS VARCHAR(10)) + ' rounds, created ' + CAST(@matchesCreated AS VARCHAR(10)) + ' matches so far';
    END
    
    SET @round = @round + 1;
END

PRINT 'Matches created in this run: ' + CAST(@matchesCreated AS VARCHAR(10));

SELECT @matchCount = COUNT(*) FROM matches WHERE season_id = @season2024Id AND status = 'completed';
PRINT 'Matches created: ' + CAST(@matchCount AS VARCHAR(10));

-- ============================================================
-- CREATE MATCH EVENTS FOR SEASON 2024
-- ============================================================

PRINT '--- Creating match events for Season 2024 ---';

-- Delete existing events first to recreate them
DELETE FROM match_events WHERE season_id = @season2024Id;
PRINT 'Deleted existing match events for Season 2024';

DECLARE @matchId INT, @mHomeScore INT, @mAwayScore INT;
DECLARE @mHomeTeamId INT, @mAwayTeamId INT;
DECLARE @scorerId INT, @assistId INT, @cardPlayerId INT;
DECLARE @totalMatches INT, @eventsCreated INT = 0;
DECLARE @goalIdx INT;
DECLARE @cardCount INT, @cardIdx INT, @cardTeamId INT, @redTeamId INT;

SELECT @totalMatches = COUNT(*) FROM matches WHERE status = 'completed' AND season_id = @season2024Id;
PRINT 'Total matches to process: ' + CAST(@totalMatches AS VARCHAR(10));

DECLARE match_cursor CURSOR FOR 
SELECT match_id, ISNULL(home_score, 0), ISNULL(away_score, 0), home_season_team_id, away_season_team_id
FROM matches
WHERE status = 'completed' AND season_id = @season2024Id;

OPEN match_cursor;
FETCH NEXT FROM match_cursor INTO @matchId, @mHomeScore, @mAwayScore, @mHomeTeamId, @mAwayTeamId;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Home team goals (weight top 3 forwards to score more)
    SET @goalIdx = 1;
    WHILE @goalIdx <= @mHomeScore
    BEGIN
        -- 60% chance: pick from top 3 forwards, 40% random
        IF ABS(CHECKSUM(NEWID())) % 10 < 6
            SELECT TOP 1 @scorerId = season_player_id FROM season_player_registrations 
            WHERE season_team_id = @mHomeTeamId AND position_code IN ('ST', 'LW', 'RW') 
            ORDER BY NEWID();
        ELSE
            SELECT TOP 1 @scorerId = season_player_id FROM season_player_registrations 
            WHERE season_team_id = @mHomeTeamId AND position_code != 'GK' ORDER BY NEWID();
        
        SELECT TOP 1 @assistId = season_player_id FROM season_player_registrations 
        WHERE season_team_id = @mHomeTeamId AND season_player_id != ISNULL(@scorerId, 0) ORDER BY NEWID();
        
        IF @scorerId IS NOT NULL
        BEGIN
            BEGIN TRY
                INSERT INTO match_events (match_id, season_id, season_team_id, season_player_id,
                    related_season_player_id, ruleset_id, event_type, event_minute, goal_type_code)
                VALUES (@matchId, @season2024Id, @mHomeTeamId, @scorerId, @assistId, @rulesetId,
                    'GOAL', 1 + ABS(CHECKSUM(NEWID())) % 89, 'open_play');
                SET @eventsCreated = @eventsCreated + 1;
                
                IF @assistId IS NOT NULL
                BEGIN
                    INSERT INTO match_events (match_id, season_id, season_team_id, season_player_id,
                        related_season_player_id, ruleset_id, event_type, event_minute)
                    VALUES (@matchId, @season2024Id, @mHomeTeamId, @assistId, @scorerId, @rulesetId,
                        'ASSIST', 1 + ABS(CHECKSUM(NEWID())) % 89);
                    SET @eventsCreated = @eventsCreated + 1;
                END
            END TRY
            BEGIN CATCH
                PRINT 'ERROR creating goal event: ' + ERROR_MESSAGE();
            END CATCH
        END
        SET @goalIdx = @goalIdx + 1;
    END
    
    -- Away team goals (weight top 3 forwards to score more)
    SET @goalIdx = 1;
    WHILE @goalIdx <= @mAwayScore
    BEGIN
        -- 60% chance: pick from top 3 forwards, 40% random
        IF ABS(CHECKSUM(NEWID())) % 10 < 6
            SELECT TOP 1 @scorerId = season_player_id FROM season_player_registrations 
            WHERE season_team_id = @mAwayTeamId AND position_code IN ('ST', 'LW', 'RW') 
            ORDER BY NEWID();
        ELSE
            SELECT TOP 1 @scorerId = season_player_id FROM season_player_registrations 
            WHERE season_team_id = @mAwayTeamId AND position_code != 'GK' ORDER BY NEWID();
        
        SELECT TOP 1 @assistId = season_player_id FROM season_player_registrations 
        WHERE season_team_id = @mAwayTeamId AND season_player_id != ISNULL(@scorerId, 0) ORDER BY NEWID();
        
        IF @scorerId IS NOT NULL
        BEGIN
            BEGIN TRY
                INSERT INTO match_events (match_id, season_id, season_team_id, season_player_id,
                    related_season_player_id, ruleset_id, event_type, event_minute, goal_type_code)
                VALUES (@matchId, @season2024Id, @mAwayTeamId, @scorerId, @assistId, @rulesetId,
                    'GOAL', 1 + ABS(CHECKSUM(NEWID())) % 89, 'open_play');
                SET @eventsCreated = @eventsCreated + 1;
                
                IF @assistId IS NOT NULL
                BEGIN
                    INSERT INTO match_events (match_id, season_id, season_team_id, season_player_id,
                        related_season_player_id, ruleset_id, event_type, event_minute)
                    VALUES (@matchId, @season2024Id, @mAwayTeamId, @assistId, @scorerId, @rulesetId,
                        'ASSIST', 1 + ABS(CHECKSUM(NEWID())) % 89);
                    SET @eventsCreated = @eventsCreated + 1;
                END
            END TRY
            BEGIN CATCH
                PRINT 'ERROR creating goal event: ' + ERROR_MESSAGE();
            END CATCH
        END
        SET @goalIdx = @goalIdx + 1;
    END
    
    -- Yellow cards (0-4 per match)
    SET @cardCount = ABS(CHECKSUM(NEWID())) % 5;
    SET @cardIdx = 1;
    WHILE @cardIdx <= @cardCount
    BEGIN
        SET @cardTeamId = CASE WHEN ABS(CHECKSUM(NEWID())) % 2 = 0 THEN @mHomeTeamId ELSE @mAwayTeamId END;
        
        SELECT TOP 1 @cardPlayerId = season_player_id FROM season_player_registrations 
        WHERE season_team_id = @cardTeamId ORDER BY NEWID();
        
        IF @cardPlayerId IS NOT NULL
        BEGIN
            BEGIN TRY
                INSERT INTO match_events (match_id, season_id, season_team_id, season_player_id,
                    ruleset_id, event_type, event_minute, card_type)
                VALUES (@matchId, @season2024Id, @cardTeamId, @cardPlayerId, @rulesetId,
                    'CARD', 1 + ABS(CHECKSUM(NEWID())) % 89, 'YELLOW');
                SET @eventsCreated = @eventsCreated + 1;
            END TRY
            BEGIN CATCH
                PRINT 'ERROR creating yellow card event: ' + ERROR_MESSAGE();
            END CATCH
        END
        
        SET @cardIdx = @cardIdx + 1;
    END
    
    -- Red card (10% chance)
    IF ABS(CHECKSUM(NEWID())) % 10 = 0
    BEGIN
        SET @redTeamId = CASE WHEN ABS(CHECKSUM(NEWID())) % 2 = 0 THEN @mHomeTeamId ELSE @mAwayTeamId END;
        
        SELECT TOP 1 @cardPlayerId = season_player_id FROM season_player_registrations 
        WHERE season_team_id = @redTeamId ORDER BY NEWID();
        
        IF @cardPlayerId IS NOT NULL
        BEGIN
            BEGIN TRY
                INSERT INTO match_events (match_id, season_id, season_team_id, season_player_id,
                    ruleset_id, event_type, event_minute, card_type)
                VALUES (@matchId, @season2024Id, @redTeamId, @cardPlayerId, @rulesetId,
                    'CARD', 1 + ABS(CHECKSUM(NEWID())) % 89, 'RED');
                SET @eventsCreated = @eventsCreated + 1;
            END TRY
            BEGIN CATCH
                PRINT 'ERROR creating red card event: ' + ERROR_MESSAGE();
            END CATCH
        END
    END
    
    FETCH NEXT FROM match_cursor INTO @matchId, @mHomeScore, @mAwayScore, @mHomeTeamId, @mAwayTeamId;
END

CLOSE match_cursor;
DEALLOCATE match_cursor;

SELECT @eventCount = COUNT(*) FROM match_events WHERE season_id = @season2024Id;
PRINT 'Match events created in this run: ' + CAST(@eventsCreated AS VARCHAR(10));
PRINT 'Total match events: ' + CAST(@eventCount AS VARCHAR(10));

-- ============================================================
-- CREATE/UPDATE STANDINGS FOR SEASON 2024
-- ============================================================

PRINT '--- Creating/updating standings for Season 2024 ---';

-- Delete existing standings
DELETE FROM season_team_statistics WHERE season_id = @season2024Id;

-- Calculate and insert standings
INSERT INTO season_team_statistics (season_id, season_team_id, matches_played, wins, draws, losses, 
    goals_for, goals_against, points, current_rank)
SELECT 
    @season2024Id,
    stp.season_team_id,
    COUNT(DISTINCT m.match_id) AS matches_played,
    SUM(CASE 
        WHEN m.home_season_team_id = stp.season_team_id AND m.home_score > m.away_score THEN 1
        WHEN m.away_season_team_id = stp.season_team_id AND m.away_score > m.home_score THEN 1
        ELSE 0 
    END) AS wins,
    SUM(CASE 
        WHEN (m.home_season_team_id = stp.season_team_id OR m.away_season_team_id = stp.season_team_id)
        AND m.home_score = m.away_score THEN 1
        ELSE 0 
    END) AS draws,
    SUM(CASE 
        WHEN m.home_season_team_id = stp.season_team_id AND m.home_score < m.away_score THEN 1
        WHEN m.away_season_team_id = stp.season_team_id AND m.away_score < m.home_score THEN 1
        ELSE 0 
    END) AS losses,
    SUM(CASE 
        WHEN m.home_season_team_id = stp.season_team_id THEN m.home_score
        WHEN m.away_season_team_id = stp.season_team_id THEN m.away_score
        ELSE 0 
    END) AS goals_for,
    SUM(CASE 
        WHEN m.home_season_team_id = stp.season_team_id THEN m.away_score
        WHEN m.away_season_team_id = stp.season_team_id THEN m.home_score
        ELSE 0 
    END) AS goals_against,
    SUM(CASE 
        WHEN m.home_season_team_id = stp.season_team_id AND m.home_score > m.away_score THEN 3
        WHEN m.away_season_team_id = stp.season_team_id AND m.away_score > m.home_score THEN 3
        WHEN (m.home_season_team_id = stp.season_team_id OR m.away_season_team_id = stp.season_team_id)
        AND m.home_score = m.away_score THEN 1
        ELSE 0 
    END) AS points,
    NULL AS current_rank
FROM season_team_participants stp
LEFT JOIN matches m ON (m.home_season_team_id = stp.season_team_id OR m.away_season_team_id = stp.season_team_id)
    AND m.season_id = @season2024Id AND m.status = 'completed'
WHERE stp.season_id = @season2024Id
GROUP BY stp.season_team_id;

-- Update ranks
;WITH RankedTeams AS (
    SELECT season_team_id,
        ROW_NUMBER() OVER (ORDER BY points DESC, goal_difference DESC, goals_for DESC) AS rank_num
    FROM season_team_statistics
    WHERE season_id = @season2024Id
)
UPDATE sts
SET current_rank = rt.rank_num
FROM season_team_statistics sts
INNER JOIN RankedTeams rt ON sts.season_team_id = rt.season_team_id
WHERE sts.season_id = @season2024Id;

SELECT @standingsCount = COUNT(*) FROM season_team_statistics WHERE season_id = @season2024Id;
PRINT 'Standings created: ' + CAST(@standingsCount AS VARCHAR(10));

-- ============================================================
-- FINAL SUMMARY
-- ============================================================

PRINT '=== Season 2024 Data Fix Complete ===';

SELECT 'Teams' as Entity, COUNT(*) as Count FROM season_team_participants WHERE season_id = @season2024Id
UNION ALL SELECT 'Players', COUNT(*) FROM season_player_registrations WHERE season_id = @season2024Id
UNION ALL SELECT 'Matches', COUNT(*) FROM matches WHERE season_id = @season2024Id AND status = 'completed'
UNION ALL SELECT 'Goals', COUNT(*) FROM match_events WHERE event_type = 'GOAL' AND season_id = @season2024Id
UNION ALL SELECT 'Assists', COUNT(*) FROM match_events WHERE event_type = 'ASSIST' AND season_id = @season2024Id
UNION ALL SELECT 'Yellow Cards', COUNT(*) FROM match_events WHERE event_type = 'CARD' AND card_type = 'YELLOW' AND season_id = @season2024Id
UNION ALL SELECT 'Red Cards', COUNT(*) FROM match_events WHERE event_type = 'CARD' AND card_type = 'RED' AND season_id = @season2024Id
UNION ALL SELECT 'Standings', COUNT(*) FROM season_team_statistics WHERE season_id = @season2024Id;

PRINT 'Done!';
GO

