/*
  Debug script for Season 2024 Data
*/

SET NOCOUNT ON;
PRINT '=== DEBUG Season 2024 ===';

-- Find Season 2024
DECLARE @season2024Id INT;
SELECT TOP 1 @season2024Id = season_id 
FROM seasons 
WHERE (name LIKE N'%2024%' OR code LIKE '%2024%')
ORDER BY season_id DESC;

PRINT 'Season 2024 ID: ' + ISNULL(CAST(@season2024Id AS VARCHAR(10)), 'NULL');

-- Check teams in @teams2024 table variable
DECLARE @teams2024 TABLE (seq INT, season_team_id INT, team_id INT, stadium_id INT);
INSERT INTO @teams2024 (seq, season_team_id, team_id, stadium_id)
SELECT TOP 10 ROW_NUMBER() OVER (ORDER BY stp.season_team_id), stp.season_team_id, stp.team_id,
       ISNULL(t.home_stadium_id, 1)
FROM season_team_participants stp
JOIN teams t ON t.team_id = stp.team_id
WHERE stp.season_id = @season2024Id
ORDER BY stp.season_team_id;

PRINT 'Teams in @teams2024:';
SELECT * FROM @teams2024;

-- Check if we have seq 1-10
PRINT 'Checking seq values:';
SELECT seq, season_team_id FROM @teams2024 ORDER BY seq;

-- Check rounds
PRINT 'Rounds for Season 2024:';
SELECT round_id, round_number, name, status FROM season_rounds WHERE season_id = @season2024Id ORDER BY round_number;

-- Test getting team by seq
DECLARE @testHomeTeamId INT, @testAwayTeamId INT, @testStadiumId INT;
SELECT @testHomeTeamId = season_team_id, @testStadiumId = stadium_id FROM @teams2024 WHERE seq = 1;
SELECT @testAwayTeamId = season_team_id FROM @teams2024 WHERE seq = 10;

PRINT 'Test Team Seq 1: season_team_id = ' + ISNULL(CAST(@testHomeTeamId AS VARCHAR(10)), 'NULL') + ', stadium_id = ' + ISNULL(CAST(@testStadiumId AS VARCHAR(10)), 'NULL');
PRINT 'Test Team Seq 10: season_team_id = ' + ISNULL(CAST(@testAwayTeamId AS VARCHAR(10)), 'NULL');

-- Check if ROW_NUMBER() is working correctly
PRINT 'Direct query with ROW_NUMBER():';
SELECT TOP 10 
    ROW_NUMBER() OVER (ORDER BY stp.season_team_id) as rn,
    stp.season_team_id, 
    stp.team_id,
    ISNULL(t.home_stadium_id, 1) as stadium_id
FROM season_team_participants stp
JOIN teams t ON t.team_id = stp.team_id
WHERE stp.season_id = @season2024Id
ORDER BY stp.season_team_id;

-- Check existing matches
PRINT 'Existing matches for Season 2024:';
SELECT COUNT(*) as match_count FROM matches WHERE season_id = @season2024Id;

-- Try to create ONE test match
DECLARE @roundId INT;
SELECT TOP 1 @roundId = round_id FROM season_rounds WHERE season_id = @season2024Id ORDER BY round_number;

PRINT 'First Round ID: ' + ISNULL(CAST(@roundId AS VARCHAR(10)), 'NULL');

DECLARE @rulesetId INT;
SELECT TOP 1 @rulesetId = ruleset_id FROM rulesets WHERE is_active = 1;
PRINT 'Ruleset ID: ' + ISNULL(CAST(@rulesetId AS VARCHAR(10)), 'NULL');

-- Check players for teams
PRINT 'Players for each team:';
SELECT t.seq, t.season_team_id, COUNT(spr.season_player_id) as player_count
FROM @teams2024 t
LEFT JOIN season_player_registrations spr ON spr.season_team_id = t.season_team_id
GROUP BY t.seq, t.season_team_id
ORDER BY t.seq;

PRINT '=== END DEBUG ===';
GO



