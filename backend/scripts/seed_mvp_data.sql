-- Script to seed Player of the Match (MVP) data for Season 2024 and 2025
-- Logic Revised:
-- 1. DELETE existing MVP data for Season 10 & 11 to reset.
-- 2. Identify completed matches.
-- 3. For each match:
--    a. Try to find the player with MOST GOALS in that match from the winning team (or any team if draw).
--    b. If found, make them MVP (High priority).
--    c. If no goals (0-0), pick a Goalkeeper or Defender.
--    d. Else, pick random player.

BEGIN TRANSACTION;

BEGIN TRY
    -- 1. CLEAR OLD DATA
    PRINT 'Clearing existing MVP data for Season 2024 (10) and 2025 (11)...';
    DELETE FROM player_of_match 
    WHERE match_id IN (
        SELECT match_id FROM matches WHERE season_id IN (10, 11) AND status = 'completed'
    );

    DECLARE @matches_to_seed TABLE (match_id INT, season_id INT, home_team_id INT, away_team_id INT, home_score INT, away_score INT);
    
    -- Get all completed matches
    INSERT INTO @matches_to_seed (match_id, season_id, home_team_id, away_team_id, home_score, away_score)
    SELECT m.match_id, m.season_id, m.home_season_team_id, m.away_season_team_id, m.home_score, m.away_score
    FROM matches m
    WHERE m.status = 'completed'
      AND m.season_id IN (10, 11);

    DECLARE @matchId INT, @seasonId INT, @homeTeamId INT, @awayTeamId INT, @homeScore INT, @awayScore INT;
    DECLARE @winningSeasonTeamId INT;
    DECLARE @mvpPlayerId INT, @mvpTeamId INT;
    DECLARE @bestScorerId INT;

    -- Cursor to iterate through matches
    DECLARE match_cursor CURSOR FOR 
    SELECT match_id, season_id, home_team_id, away_team_id, home_score, away_score FROM @matches_to_seed;

    OPEN match_cursor;
    FETCH NEXT FROM match_cursor INTO @matchId, @seasonId, @homeTeamId, @awayTeamId, @homeScore, @awayScore;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @mvpPlayerId = NULL;
        SET @winningSeasonTeamId = NULL;

        -- Determine winning context
        IF @homeScore > @awayScore
            SET @winningSeasonTeamId = @homeTeamId;
        ELSE IF @awayScore > @homeScore
            SET @winningSeasonTeamId = @awayTeamId;
        
        -- STRATEGY 1: Pick Top Scorer of the match (Priority)
        IF @winningSeasonTeamId IS NOT NULL
        BEGIN
            -- Find player from winning team with most goals in this match
            SELECT TOP 1 @mvpPlayerId = spr.player_id, @mvpTeamId = t.team_id
            FROM match_events me
            JOIN season_player_registrations spr ON me.season_player_id = spr.season_player_id
            JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
            JOIN teams t ON stp.team_id = t.team_id
            WHERE me.match_id = @matchId 
              AND me.event_type = 'GOAL' 
              AND spr.season_team_id = @winningSeasonTeamId
            GROUP BY spr.player_id, t.team_id
            ORDER BY COUNT(*) DESC, NEWID(); -- Most goals, random tie-breaker
        END
        ELSE -- Draw
        BEGIN
            -- Find any player with goals
            SELECT TOP 1 @mvpPlayerId = spr.player_id, @mvpTeamId = t.team_id
            FROM match_events me
            JOIN season_player_registrations spr ON me.season_player_id = spr.season_player_id
            JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
            JOIN teams t ON stp.team_id = t.team_id
            WHERE me.match_id = @matchId 
              AND me.event_type = 'GOAL'
            GROUP BY spr.player_id, t.team_id
            ORDER BY COUNT(*) DESC, NEWID();
        END

        -- STRATEGY 2: If no scorer found (e.g. 0-0 draw or data missing), pick Goalkeeper or Defender
        IF @mvpPlayerId IS NULL
        BEGIN
            -- Pick random team context
            DECLARE @targetTeamId INT;
            IF @winningSeasonTeamId IS NOT NULL
                SET @targetTeamId = @winningSeasonTeamId;
            ELSE
                SET @targetTeamId = CASE WHEN ABS(CHECKSUM(NEWID())) % 2 = 0 THEN @homeTeamId ELSE @awayTeamId END;

            -- Try to find GK or DF
            SELECT TOP 1 @mvpPlayerId = spr.player_id, @mvpTeamId = t.team_id
            FROM season_player_registrations spr
            JOIN players p ON spr.player_id = p.player_id
            JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
            JOIN teams t ON stp.team_id = t.team_id
            WHERE spr.season_team_id = @targetTeamId
              AND (spr.position_code IN ('GK', 'CB', 'LB', 'RB') OR ABS(CHECKSUM(NEWID())) % 10 < 2) -- Mostly defenders, slight chance for others
            ORDER BY NEWID();
        END

        -- Insert MVP
        IF @mvpPlayerId IS NOT NULL
        BEGIN
            INSERT INTO player_of_match (match_id, player_id, team_id, selected_by_method, votes_count, rating)
            VALUES (@matchId, @mvpPlayerId, @mvpTeamId, 'statistics', 50 + ABS(CHECKSUM(NEWID())) % 100, 8.5 + (ABS(CHECKSUM(NEWID())) % 15) / 10.0);
        END

        FETCH NEXT FROM match_cursor INTO @matchId, @seasonId, @homeTeamId, @awayTeamId, @homeScore, @awayScore;
    END

    CLOSE match_cursor;
    DEALLOCATE match_cursor;

    PRINT 'Successfully re-seeded realistic MVP data based on match performance';
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    PRINT 'Error seeding MVP data: ' + ERROR_MESSAGE();
    ROLLBACK TRANSACTION;
END CATCH;
