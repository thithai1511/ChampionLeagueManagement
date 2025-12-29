/*
  Migration: Seed Demo Data for Statistics (Season 2024 & 2025)
  Purpose: Add demo data to existing seasons and create standings
  Date: 2025-12-29
  
  NOTE: This script uses existing seasons (2024 and 2025) and adds data to them.
*/

SET NOCOUNT ON;
PRINT '=== Starting Demo Data Seed for Existing Seasons ===';

-- ============================================================
-- CLEANUP: Remove demo seasons if they exist
-- ============================================================
PRINT '--- Cleaning up demo seasons if exist ---';

-- Delete match events for demo seasons
DELETE FROM match_events WHERE season_id IN (
    SELECT season_id FROM seasons WHERE code IN ('DEMO-2024', 'DEMO-2025', 'VLEAGUE-2024', 'VLEAGUE-2025')
);

-- Delete matches for demo seasons
DELETE FROM matches WHERE season_id IN (
    SELECT season_id FROM seasons WHERE code IN ('DEMO-2024', 'DEMO-2025', 'VLEAGUE-2024', 'VLEAGUE-2025')
);

-- Delete season rounds for demo seasons
DELETE FROM season_rounds WHERE season_id IN (
    SELECT season_id FROM seasons WHERE code IN ('DEMO-2024', 'DEMO-2025', 'VLEAGUE-2024', 'VLEAGUE-2025')
);

-- Delete player registrations for demo seasons
DELETE FROM season_player_registrations WHERE season_id IN (
    SELECT season_id FROM seasons WHERE code IN ('DEMO-2024', 'DEMO-2025', 'VLEAGUE-2024', 'VLEAGUE-2025')
);

-- Delete team participants for demo seasons
DELETE FROM season_team_participants WHERE season_id IN (
    SELECT season_id FROM seasons WHERE code IN ('DEMO-2024', 'DEMO-2025', 'VLEAGUE-2024', 'VLEAGUE-2025')
);

-- Delete team registrations for demo seasons
DELETE FROM season_team_registrations WHERE season_id IN (
    SELECT season_id FROM seasons WHERE code IN ('DEMO-2024', 'DEMO-2025', 'VLEAGUE-2024', 'VLEAGUE-2025')
);

-- Delete demo seasons
DELETE FROM seasons WHERE code IN ('DEMO-2024', 'DEMO-2025', 'VLEAGUE-2024', 'VLEAGUE-2025');

PRINT 'Cleanup complete.';

-- ============================================================
-- FIND EXISTING SEASONS
-- ============================================================

PRINT '--- Finding Existing Seasons ---';

DECLARE @season2024Id INT, @season2025Id INT;

-- Find Season 2024 (try different patterns)
SELECT TOP 1 @season2024Id = season_id 
FROM seasons 
WHERE (name LIKE N'%2024%' OR code LIKE '%2024%')
  AND season_id NOT IN (SELECT season_id FROM seasons WHERE code IN ('DEMO-2024', 'VLEAGUE-2024'))
ORDER BY season_id DESC;

-- Find Season 2025 (try different patterns)
SELECT TOP 1 @season2025Id = season_id 
FROM seasons 
WHERE (name LIKE N'%2025%' OR code LIKE '%2025%')
  AND season_id NOT IN (SELECT season_id FROM seasons WHERE code IN ('DEMO-2025', 'VLEAGUE-2025'))
ORDER BY season_id DESC;

IF @season2024Id IS NULL
BEGIN
    PRINT 'ERROR: Season 2024 not found. Please create it first.';
    RETURN;
END

IF @season2025Id IS NULL
BEGIN
    PRINT 'ERROR: Season 2025 not found. Please create it first.';
    RETURN;
END

PRINT 'Found Season 2024, ID: ' + CAST(@season2024Id AS VARCHAR(10));
PRINT 'Found Season 2025, ID: ' + CAST(@season2025Id AS VARCHAR(10));

-- ============================================================
-- SETUP VARIABLES
-- ============================================================

DECLARE @rulesetId INT;
DECLARE @adminUserId INT = 1;

-- Get existing ruleset
SELECT TOP 1 @rulesetId = ruleset_id FROM rulesets WHERE is_active = 1;
IF @rulesetId IS NULL
BEGIN
    PRINT 'ERROR: No active ruleset found.';
    RETURN;
END

-- Get default stadium
DECLARE @defaultStadiumId INT;
SELECT TOP 1 @defaultStadiumId = stadium_id FROM stadiums;
IF @defaultStadiumId IS NULL
BEGIN
    INSERT INTO stadiums (name, city, capacity, rating_stars, is_certified, created_by)
    VALUES (N'Default Stadium', N'Default City', 20000, 3, 1, @adminUserId);
    SET @defaultStadiumId = SCOPE_IDENTITY();
END

-- ============================================================
-- GET EXISTING TEAMS (10 teams)
-- ============================================================

PRINT '--- Getting Existing Teams ---';

DECLARE @selectedTeams TABLE (idx INT IDENTITY(1,1), team_id INT, team_name NVARCHAR(255), stadium_id INT);

INSERT INTO @selectedTeams (team_id, team_name, stadium_id)
SELECT TOP 10 t.team_id, t.name, ISNULL(t.home_stadium_id, @defaultStadiumId)
FROM teams t
WHERE t.status = 'active'
ORDER BY t.team_id;

DECLARE @actualTeamCount INT;
SELECT @actualTeamCount = COUNT(*) FROM @selectedTeams;
PRINT 'Selected ' + CAST(@actualTeamCount AS VARCHAR(10)) + ' teams';

IF @actualTeamCount < 10
BEGIN
    PRINT 'ERROR: Not enough teams. Need at least 10 active teams.';
    RETURN;
END

-- ============================================================
-- REGISTER TEAMS FOR BOTH SEASONS (if not already registered)
-- ============================================================

PRINT '--- Registering Teams ---';

-- Season 2024 registrations
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

-- Season 2025 registrations  
INSERT INTO season_team_registrations (season_id, team_id, fee_status, registration_status,
    home_stadium_name, home_stadium_capacity, home_stadium_rating, squad_size, foreign_player_count)
SELECT @season2025Id, st.team_id, 'paid', 'approved',
    ISNULL(s.name, N'Default Stadium'), ISNULL(s.capacity, 20000), 3, 22, 3
FROM @selectedTeams st
LEFT JOIN stadiums s ON s.stadium_id = st.stadium_id
WHERE NOT EXISTS (
    SELECT 1 FROM season_team_registrations 
    WHERE season_id = @season2025Id AND team_id = st.team_id
);

PRINT 'Team registrations created';

-- ============================================================
-- CREATE SEASON TEAM PARTICIPANTS
-- ============================================================

PRINT '--- Creating Season Team Participants ---';

-- Season 2024
INSERT INTO season_team_participants (season_id, team_id, registration_id, seed_number, status)
SELECT @season2024Id, r.team_id, r.registration_id, ROW_NUMBER() OVER (ORDER BY r.team_id), 'active'
FROM season_team_registrations r
WHERE r.season_id = @season2024Id
AND NOT EXISTS (
    SELECT 1 FROM season_team_participants 
    WHERE season_id = @season2024Id AND team_id = r.team_id
);

-- Season 2025
INSERT INTO season_team_participants (season_id, team_id, registration_id, seed_number, status)
SELECT @season2025Id, r.team_id, r.registration_id, ROW_NUMBER() OVER (ORDER BY r.team_id), 'active'
FROM season_team_registrations r
WHERE r.season_id = @season2025Id
AND NOT EXISTS (
    SELECT 1 FROM season_team_participants 
    WHERE season_id = @season2025Id AND team_id = r.team_id
);

PRINT 'Season team participants created';

-- ============================================================
-- CREATE PLAYERS (22 per team) - Only if not exist
-- ============================================================

PRINT '--- Creating Players (if needed) ---';

DECLARE @teamId INT, @playerIdx INT;
DECLARE @positions TABLE (idx INT, pos VARCHAR(10));
INSERT INTO @positions VALUES (1,'GK'),(2,'GK'),(3,'CB'),(4,'CB'),(5,'CB'),
    (6,'LB'),(7,'RB'),(8,'CDM'),(9,'CM'),(10,'CM'),(11,'CAM'),(12,'LM'),
    (13,'RM'),(14,'LW'),(15,'RW'),(16,'CF'),(17,'ST'),(18,'ST'),
    (19,'CB'),(20,'CM'),(21,'ST'),(22,'GK');

DECLARE team_loop CURSOR FOR SELECT team_id FROM @selectedTeams;
OPEN team_loop;
FETCH NEXT FROM team_loop INTO @teamId;

WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @playerCount INT;
    SELECT @playerCount = COUNT(*) FROM players WHERE current_team_id = @teamId;
    
    IF @playerCount < 22
    BEGIN
        SET @playerIdx = @playerCount + 1;
        WHILE @playerIdx <= 22
        BEGIN
            DECLARE @pName NVARCHAR(255) = N'Cầu thủ ' + CAST(@teamId AS NVARCHAR(10)) + N'-' + CAST(@playerIdx AS NVARCHAR(10));
            DECLARE @pPos VARCHAR(10);
            SELECT @pPos = pos FROM @positions WHERE idx = @playerIdx;
            
            IF NOT EXISTS (SELECT 1 FROM players WHERE full_name = @pName)
            BEGIN
                INSERT INTO players (full_name, display_name, date_of_birth, nationality, preferred_position,
                    height_cm, weight_kg, dominant_foot, current_team_id, created_by)
                VALUES (@pName, @pName, DATEADD(YEAR, -(18 + ABS(CHECKSUM(NEWID())) % 17), GETDATE()),
                    N'Việt Nam', @pPos, 170 + ABS(CHECKSUM(NEWID())) % 15, 65 + ABS(CHECKSUM(NEWID())) % 15,
                    'right', @teamId, @adminUserId);
            END
            
            SET @playerIdx = @playerIdx + 1;
        END
    END
    
    FETCH NEXT FROM team_loop INTO @teamId;
END
CLOSE team_loop;
DEALLOCATE team_loop;

PRINT 'Players created';

-- ============================================================
-- REGISTER PLAYERS FOR SEASONS
-- ============================================================

PRINT '--- Registering Players for Seasons ---';

-- Season 2024 player registrations
;WITH PlayerRegistrations2024 AS (
    SELECT 
        stp.season_team_id,
        p.player_id,
        p.preferred_position,
        p.date_of_birth,
        ROW_NUMBER() OVER (PARTITION BY stp.season_team_id ORDER BY p.player_id) AS shirt_num,
        DATEDIFF(YEAR, p.date_of_birth, (SELECT start_date FROM seasons WHERE season_id = @season2024Id)) AS age
    FROM players p
    JOIN season_team_participants stp ON stp.team_id = p.current_team_id AND stp.season_id = @season2024Id
    WHERE p.current_team_id IN (SELECT team_id FROM @selectedTeams)
    AND NOT EXISTS (
        SELECT 1 FROM season_player_registrations spr 
        WHERE spr.season_id = @season2024Id AND spr.player_id = p.player_id
    )
    AND DATEDIFF(YEAR, p.date_of_birth, (SELECT start_date FROM seasons WHERE season_id = @season2024Id)) BETWEEN 16 AND 40
)
INSERT INTO season_player_registrations (season_id, season_team_id, player_id, registration_status,
    player_type, is_foreign, shirt_number, position_code, age_on_season_start)
SELECT @season2024Id, season_team_id, player_id, 'approved', 'domestic', 0,
    shirt_num, preferred_position, age
FROM PlayerRegistrations2024
WHERE NOT EXISTS (
    SELECT 1 FROM season_player_registrations 
    WHERE season_team_id = PlayerRegistrations2024.season_team_id 
    AND shirt_number = PlayerRegistrations2024.shirt_num
);

-- Season 2025 player registrations
;WITH PlayerRegistrations2025 AS (
    SELECT 
        stp.season_team_id,
        p.player_id,
        p.preferred_position,
        p.date_of_birth,
        ROW_NUMBER() OVER (PARTITION BY stp.season_team_id ORDER BY p.player_id) AS shirt_num,
        DATEDIFF(YEAR, p.date_of_birth, (SELECT start_date FROM seasons WHERE season_id = @season2025Id)) AS age
    FROM players p
    JOIN season_team_participants stp ON stp.team_id = p.current_team_id AND stp.season_id = @season2025Id
    WHERE p.current_team_id IN (SELECT team_id FROM @selectedTeams)
    AND NOT EXISTS (
        SELECT 1 FROM season_player_registrations spr
        WHERE spr.season_id = @season2025Id AND spr.player_id = p.player_id
    )
    AND DATEDIFF(YEAR, p.date_of_birth, (SELECT start_date FROM seasons WHERE season_id = @season2025Id)) BETWEEN 16 AND 40
)
INSERT INTO season_player_registrations (season_id, season_team_id, player_id, registration_status,
    player_type, is_foreign, shirt_number, position_code, age_on_season_start)
SELECT @season2025Id, season_team_id, player_id, 'approved', 'domestic', 0,
    shirt_num, preferred_position, age
FROM PlayerRegistrations2025
WHERE NOT EXISTS (
    SELECT 1 FROM season_player_registrations 
    WHERE season_team_id = PlayerRegistrations2025.season_team_id 
    AND shirt_number = PlayerRegistrations2025.shirt_num
);

PRINT 'Player registrations created';

-- ============================================================
-- CREATE SEASON ROUNDS
-- ============================================================

PRINT '--- Creating Season Rounds ---';

-- Get season start dates
DECLARE @season2024Start DATE, @season2025Start DATE;
SELECT @season2024Start = start_date FROM seasons WHERE season_id = @season2024Id;
SELECT @season2025Start = start_date FROM seasons WHERE season_id = @season2025Id;

-- Season 2024 rounds (all completed)
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

-- Season 2025 rounds
SET @roundNum = 1;
SET @roundDate = DATEADD(DAY, 15, @season2025Start);

WHILE @roundNum <= 18
BEGIN
    IF NOT EXISTS (SELECT 1 FROM season_rounds WHERE season_id = @season2025Id AND round_number = @roundNum)
    BEGIN
        INSERT INTO season_rounds (season_id, round_number, name, start_date, end_date, status)
        VALUES (@season2025Id, @roundNum, N'Vòng ' + CAST(@roundNum AS NVARCHAR(10)),
                @roundDate, DATEADD(DAY, 6, @roundDate), 
                CASE WHEN @roundNum <= 10 THEN 'completed' ELSE 'planned' END);
    END
    SET @roundDate = DATEADD(WEEK, 1, @roundDate);
    SET @roundNum = @roundNum + 1;
END

PRINT 'Season rounds created';

-- ============================================================
-- CREATE MATCHES
-- ============================================================

PRINT '--- Creating Matches ---';

-- Get team participants for each season
DECLARE @teams2024 TABLE (seq INT, season_team_id INT, stadium_id INT);
INSERT INTO @teams2024 (seq, season_team_id, stadium_id)
SELECT ROW_NUMBER() OVER (ORDER BY stp.season_team_id), stp.season_team_id, 
       ISNULL(t.home_stadium_id, @defaultStadiumId)
FROM season_team_participants stp
JOIN teams t ON t.team_id = stp.team_id
WHERE stp.season_id = @season2024Id;

DECLARE @teams2025 TABLE (seq INT, season_team_id INT, stadium_id INT);
INSERT INTO @teams2025 (seq, season_team_id, stadium_id)
SELECT ROW_NUMBER() OVER (ORDER BY stp.season_team_id), stp.season_team_id,
       ISNULL(t.home_stadium_id, @defaultStadiumId)
FROM season_team_participants stp
JOIN teams t ON t.team_id = stp.team_id
WHERE stp.season_id = @season2025Id;

-- Create matches for Season 2024 (18 rounds, 5 matches each)
DECLARE @round INT, @matchNum INT;
DECLARE @roundId INT;
DECLARE @homeTeamId INT, @awayTeamId INT, @stadiumId INT;
DECLARE @homeScore INT, @awayScore INT;
DECLARE @kickoff DATETIME2;

SET @round = 1;
WHILE @round <= 18
BEGIN
    SELECT @roundId = round_id FROM season_rounds WHERE season_id = @season2024Id AND round_number = @round;
    
    IF @roundId IS NOT NULL
    BEGIN
        SET @kickoff = DATEADD(DAY, (@round - 1) * 7, CAST(@season2024Start AS DATETIME2));
        SET @kickoff = DATEADD(DAY, 15, @kickoff);
        SET @kickoff = DATEADD(HOUR, 19, CAST(CAST(@kickoff AS DATE) AS DATETIME2));
        
        SET @matchNum = 1;
        WHILE @matchNum <= 5
        BEGIN
            DECLARE @homeSeq INT = @matchNum;
            DECLARE @awaySeq INT = 11 - @matchNum;
            
            IF @round > 9
            BEGIN
                SET @homeSeq = 11 - @matchNum;
                SET @awaySeq = @matchNum;
            END
            
            SELECT @homeTeamId = season_team_id, @stadiumId = stadium_id FROM @teams2024 WHERE seq = @homeSeq;
            SELECT @awayTeamId = season_team_id FROM @teams2024 WHERE seq = @awaySeq;
            
            IF @homeTeamId IS NOT NULL AND @awayTeamId IS NOT NULL AND @roundId IS NOT NULL AND @stadiumId IS NOT NULL
            BEGIN
                SET @homeScore = ABS(CHECKSUM(NEWID())) % 5;
                SET @awayScore = ABS(CHECKSUM(NEWID())) % 4;
                
                -- Check if match already exists (more comprehensive check)
                IF NOT EXISTS (
                    SELECT 1 FROM matches 
                    WHERE season_id = @season2024Id 
                    AND round_id = @roundId
                    AND home_season_team_id = @homeTeamId 
                    AND away_season_team_id = @awayTeamId
                )
                AND NOT EXISTS (
                    SELECT 1 FROM matches
                    WHERE season_id = @season2024Id
                    AND ((home_season_team_id = @homeTeamId AND away_season_team_id = @awayTeamId)
                      OR (home_season_team_id = @awayTeamId AND away_season_team_id = @homeTeamId))
                    AND matchday_number = @round
                )
                BEGIN
                    BEGIN TRY
                        INSERT INTO matches (season_id, round_id, matchday_number, home_season_team_id, away_season_team_id,
                            stadium_id, ruleset_id, scheduled_kickoff, status, home_score, away_score, attendance)
                        VALUES (@season2024Id, @roundId, @round, @homeTeamId, @awayTeamId,
                            @stadiumId, @rulesetId, DATEADD(HOUR, @matchNum - 1, @kickoff), 'completed',
                            @homeScore, @awayScore, 10000 + ABS(CHECKSUM(NEWID())) % 15000);
                    END TRY
                    BEGIN CATCH
                        -- Skip duplicate matches silently
                        IF ERROR_NUMBER() = 2627
                            PRINT 'Skipped duplicate match: Round ' + CAST(@round AS VARCHAR(10)) + ', Teams ' + CAST(@homeTeamId AS VARCHAR(10)) + ' vs ' + CAST(@awayTeamId AS VARCHAR(10));
                    END CATCH
                END
            END
            
            SET @matchNum = @matchNum + 1;
        END
    END
    
    SET @round = @round + 1;
END

PRINT 'Season 2024 matches created';

-- Create matches for Season 2025 (10 rounds completed)
SET @round = 1;
WHILE @round <= 10
BEGIN
    SELECT @roundId = round_id FROM season_rounds WHERE season_id = @season2025Id AND round_number = @round;
    
    IF @roundId IS NOT NULL
    BEGIN
        SET @kickoff = DATEADD(DAY, (@round - 1) * 7, CAST(@season2025Start AS DATETIME2));
        SET @kickoff = DATEADD(DAY, 15, @kickoff);
        SET @kickoff = DATEADD(HOUR, 19, CAST(CAST(@kickoff AS DATE) AS DATETIME2));
        
        SET @matchNum = 1;
        WHILE @matchNum <= 5
        BEGIN
            SELECT @homeTeamId = season_team_id, @stadiumId = stadium_id FROM @teams2025 WHERE seq = @matchNum;
            SELECT @awayTeamId = season_team_id FROM @teams2025 WHERE seq = 11 - @matchNum;
            
            IF @homeTeamId IS NOT NULL AND @awayTeamId IS NOT NULL AND @roundId IS NOT NULL AND @stadiumId IS NOT NULL
            BEGIN
                SET @homeScore = ABS(CHECKSUM(NEWID())) % 5;
                SET @awayScore = ABS(CHECKSUM(NEWID())) % 4;
                
                -- Check if match already exists (more comprehensive check)
                IF NOT EXISTS (
                    SELECT 1 FROM matches 
                    WHERE season_id = @season2025Id 
                    AND round_id = @roundId
                    AND home_season_team_id = @homeTeamId 
                    AND away_season_team_id = @awayTeamId
                )
                AND NOT EXISTS (
                    SELECT 1 FROM matches
                    WHERE season_id = @season2025Id
                    AND ((home_season_team_id = @homeTeamId AND away_season_team_id = @awayTeamId)
                      OR (home_season_team_id = @awayTeamId AND away_season_team_id = @homeTeamId))
                    AND matchday_number = @round
                )
                BEGIN
                    BEGIN TRY
                        INSERT INTO matches (season_id, round_id, matchday_number, home_season_team_id, away_season_team_id,
                            stadium_id, ruleset_id, scheduled_kickoff, status, home_score, away_score, attendance)
                        VALUES (@season2025Id, @roundId, @round, @homeTeamId, @awayTeamId,
                            @stadiumId, @rulesetId, DATEADD(HOUR, @matchNum - 1, @kickoff), 'completed',
                            @homeScore, @awayScore, 10000 + ABS(CHECKSUM(NEWID())) % 15000);
                    END TRY
                    BEGIN CATCH
                        -- Skip duplicate matches silently
                        IF ERROR_NUMBER() = 2627
                            PRINT 'Skipped duplicate match: Round ' + CAST(@round AS VARCHAR(10)) + ', Teams ' + CAST(@homeTeamId AS VARCHAR(10)) + ' vs ' + CAST(@awayTeamId AS VARCHAR(10));
                    END CATCH
                END
            END
            
            SET @matchNum = @matchNum + 1;
        END
    END
    
    SET @round = @round + 1;
END

PRINT 'Season 2025 matches created';

-- ============================================================
-- CREATE MATCH EVENTS (Goals, Assists, Cards)
-- ============================================================

PRINT '--- Creating Match Events ---';

DECLARE @matchId INT, @mSeasonId INT, @mHomeScore INT, @mAwayScore INT;
DECLARE @mHomeTeamId INT, @mAwayTeamId INT;
DECLARE @scorerId INT, @assistId INT, @cardPlayerId INT;

DECLARE match_cursor CURSOR FOR 
SELECT match_id, season_id, ISNULL(home_score, 0), ISNULL(away_score, 0), home_season_team_id, away_season_team_id
FROM matches
WHERE status = 'completed' AND season_id IN (@season2024Id, @season2025Id);

OPEN match_cursor;
FETCH NEXT FROM match_cursor INTO @matchId, @mSeasonId, @mHomeScore, @mAwayScore, @mHomeTeamId, @mAwayTeamId;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT 1 FROM match_events WHERE match_id = @matchId)
    BEGIN
        -- Home team goals
        DECLARE @goalIdx INT = 1;
        WHILE @goalIdx <= @mHomeScore
        BEGIN
            SELECT TOP 1 @scorerId = season_player_id FROM season_player_registrations 
            WHERE season_team_id = @mHomeTeamId AND position_code != 'GK' ORDER BY NEWID();
            
            SELECT TOP 1 @assistId = season_player_id FROM season_player_registrations 
            WHERE season_team_id = @mHomeTeamId AND season_player_id != ISNULL(@scorerId, 0) ORDER BY NEWID();
            
            IF @scorerId IS NOT NULL
            BEGIN
                INSERT INTO match_events (match_id, season_id, season_team_id, season_player_id,
                    related_season_player_id, ruleset_id, event_type, event_minute, goal_type_code)
                VALUES (@matchId, @mSeasonId, @mHomeTeamId, @scorerId, @assistId, @rulesetId,
                    'GOAL', 1 + ABS(CHECKSUM(NEWID())) % 89, 'open_play');
                
                IF @assistId IS NOT NULL
                    INSERT INTO match_events (match_id, season_id, season_team_id, season_player_id,
                        related_season_player_id, ruleset_id, event_type, event_minute)
                    VALUES (@matchId, @mSeasonId, @mHomeTeamId, @assistId, @scorerId, @rulesetId,
                        'ASSIST', 1 + ABS(CHECKSUM(NEWID())) % 89);
            END
            SET @goalIdx = @goalIdx + 1;
        END
        
        -- Away team goals
        SET @goalIdx = 1;
        WHILE @goalIdx <= @mAwayScore
        BEGIN
            SELECT TOP 1 @scorerId = season_player_id FROM season_player_registrations 
            WHERE season_team_id = @mAwayTeamId AND position_code != 'GK' ORDER BY NEWID();
            
            SELECT TOP 1 @assistId = season_player_id FROM season_player_registrations 
            WHERE season_team_id = @mAwayTeamId AND season_player_id != ISNULL(@scorerId, 0) ORDER BY NEWID();
            
            IF @scorerId IS NOT NULL
            BEGIN
                INSERT INTO match_events (match_id, season_id, season_team_id, season_player_id,
                    related_season_player_id, ruleset_id, event_type, event_minute, goal_type_code)
                VALUES (@matchId, @mSeasonId, @mAwayTeamId, @scorerId, @assistId, @rulesetId,
                    'GOAL', 1 + ABS(CHECKSUM(NEWID())) % 89, 'open_play');
                
                IF @assistId IS NOT NULL
                    INSERT INTO match_events (match_id, season_id, season_team_id, season_player_id,
                        related_season_player_id, ruleset_id, event_type, event_minute)
                    VALUES (@matchId, @mSeasonId, @mAwayTeamId, @assistId, @scorerId, @rulesetId,
                        'ASSIST', 1 + ABS(CHECKSUM(NEWID())) % 89);
            END
            SET @goalIdx = @goalIdx + 1;
        END
        
        -- Yellow cards (0-4 per match)
        DECLARE @cardCount INT = ABS(CHECKSUM(NEWID())) % 5;
        DECLARE @cardIdx INT = 1;
        WHILE @cardIdx <= @cardCount
        BEGIN
            DECLARE @cardTeamId INT = CASE WHEN ABS(CHECKSUM(NEWID())) % 2 = 0 THEN @mHomeTeamId ELSE @mAwayTeamId END;
            
            SELECT TOP 1 @cardPlayerId = season_player_id FROM season_player_registrations 
            WHERE season_team_id = @cardTeamId ORDER BY NEWID();
            
            IF @cardPlayerId IS NOT NULL
                INSERT INTO match_events (match_id, season_id, season_team_id, season_player_id,
                    ruleset_id, event_type, event_minute, card_type)
                VALUES (@matchId, @mSeasonId, @cardTeamId, @cardPlayerId, @rulesetId,
                    'CARD', 1 + ABS(CHECKSUM(NEWID())) % 89, 'YELLOW');
            
            SET @cardIdx = @cardIdx + 1;
        END
        
        -- Red card (10% chance)
        IF ABS(CHECKSUM(NEWID())) % 10 = 0
        BEGIN
            DECLARE @redTeamId INT = CASE WHEN ABS(CHECKSUM(NEWID())) % 2 = 0 THEN @mHomeTeamId ELSE @mAwayTeamId END;
            
            SELECT TOP 1 @cardPlayerId = season_player_id FROM season_player_registrations 
            WHERE season_team_id = @redTeamId ORDER BY NEWID();
            
            IF @cardPlayerId IS NOT NULL
                INSERT INTO match_events (match_id, season_id, season_team_id, season_player_id,
                    ruleset_id, event_type, event_minute, card_type)
                VALUES (@matchId, @mSeasonId, @redTeamId, @cardPlayerId, @rulesetId,
                    'CARD', 1 + ABS(CHECKSUM(NEWID())) % 89, 'RED');
        END
    END
    
    FETCH NEXT FROM match_cursor INTO @matchId, @mSeasonId, @mHomeScore, @mAwayScore, @mHomeTeamId, @mAwayTeamId;
END

CLOSE match_cursor;
DEALLOCATE match_cursor;

PRINT 'Match events created';

-- ============================================================
-- CREATE STANDINGS (season_team_statistics)
-- ============================================================

PRINT '--- Creating Standings ---';

-- Calculate and insert standings for Season 2024
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
GROUP BY stp.season_team_id
HAVING NOT EXISTS (
    SELECT 1 FROM season_team_statistics 
    WHERE season_team_id = stp.season_team_id
);

-- Update ranks for Season 2024
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

PRINT 'Season 2024 standings created';

-- Calculate and insert standings for Season 2025
INSERT INTO season_team_statistics (season_id, season_team_id, matches_played, wins, draws, losses, 
    goals_for, goals_against, points, current_rank)
SELECT 
    @season2025Id,
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
    AND m.season_id = @season2025Id AND m.status = 'completed'
WHERE stp.season_id = @season2025Id
GROUP BY stp.season_team_id
HAVING NOT EXISTS (
    SELECT 1 FROM season_team_statistics 
    WHERE season_team_id = stp.season_team_id
);

-- Update ranks for Season 2025
;WITH RankedTeams AS (
    SELECT season_team_id,
        ROW_NUMBER() OVER (ORDER BY points DESC, goal_difference DESC, goals_for DESC) AS rank_num
    FROM season_team_statistics
    WHERE season_id = @season2025Id
)
UPDATE sts
SET current_rank = rt.rank_num
FROM season_team_statistics sts
INNER JOIN RankedTeams rt ON sts.season_team_id = rt.season_team_id
WHERE sts.season_id = @season2025Id;

PRINT 'Season 2025 standings created';

-- ============================================================
-- SUMMARY
-- ============================================================

PRINT '=== Demo Data Seed Complete ===';

SELECT 'Seasons Used' as Entity, COUNT(*) as Count FROM seasons WHERE season_id IN (@season2024Id, @season2025Id)
UNION ALL SELECT 'Teams Registered', COUNT(*) FROM season_team_participants WHERE season_id IN (@season2024Id, @season2025Id)
UNION ALL SELECT 'Players Registered', COUNT(*) FROM season_player_registrations WHERE season_id IN (@season2024Id, @season2025Id)
UNION ALL SELECT 'Season 2024 Matches', COUNT(*) FROM matches WHERE season_id = @season2024Id
UNION ALL SELECT 'Season 2025 Matches', COUNT(*) FROM matches WHERE season_id = @season2025Id
UNION ALL SELECT 'Total Goals', COUNT(*) FROM match_events WHERE event_type = 'GOAL' AND season_id IN (@season2024Id, @season2025Id)
UNION ALL SELECT 'Total Assists', COUNT(*) FROM match_events WHERE event_type = 'ASSIST' AND season_id IN (@season2024Id, @season2025Id)
UNION ALL SELECT 'Yellow Cards', COUNT(*) FROM match_events WHERE event_type = 'CARD' AND card_type = 'YELLOW' AND season_id IN (@season2024Id, @season2025Id)
UNION ALL SELECT 'Red Cards', COUNT(*) FROM match_events WHERE event_type = 'CARD' AND card_type = 'RED' AND season_id IN (@season2024Id, @season2025Id)
UNION ALL SELECT 'Standings 2024', COUNT(*) FROM season_team_statistics WHERE season_id = @season2024Id
UNION ALL SELECT 'Standings 2025', COUNT(*) FROM season_team_statistics WHERE season_id = @season2025Id;

PRINT 'Done!';
GO
