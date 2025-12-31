/* ============================================================================
   MIGRATION: Update Player Nationalities for Demo
   ----------------------------------------------------------------------------
   Purpose: Change most player nationalities to 'Việt Nam' while keeping 
   5-6 foreign players per team for demo purposes.
   ============================================================================
*/

-- Step 1: Create a temp table to track which players should remain foreign (5-6 per team)
IF OBJECT_ID('tempdb..#ForeignPlayers', 'U') IS NOT NULL
    DROP TABLE #ForeignPlayers;

-- Select 5-6 random foreign players per team
-- Using ROW_NUMBER() to pick top 5 players per team to remain foreign
WITH RankedPlayers AS (
    SELECT 
        p.player_id,
        p.current_team_id,
        p.nationality,
        ROW_NUMBER() OVER (PARTITION BY p.current_team_id ORDER BY NEWID()) AS rn
    FROM players p
    WHERE p.current_team_id IS NOT NULL
      AND p.nationality IS NOT NULL
      AND p.nationality NOT IN (N'Việt Nam', N'Vietnam', N'VN', N'Viet Nam')
)
SELECT player_id
INTO #ForeignPlayers
FROM RankedPlayers
WHERE rn <= 5;

-- Step 2: Update all other players to Vietnamese nationality
-- Keep the foreign players identified above
UPDATE players
SET nationality = N'Việt Nam',
    updated_at = SYSUTCDATETIME()
WHERE player_id NOT IN (SELECT player_id FROM #ForeignPlayers)
  AND current_team_id IS NOT NULL;

-- Also update players without teams to Vietnamese
UPDATE players
SET nationality = N'Việt Nam',
    updated_at = SYSUTCDATETIME()
WHERE current_team_id IS NULL
  AND nationality NOT IN (N'Việt Nam', N'Vietnam', N'VN', N'Viet Nam');

-- Step 3: Update season_player_registrations to reflect the is_foreign and player_type changes
UPDATE spr
SET 
    is_foreign = CASE 
        WHEN fp.player_id IS NOT NULL THEN 1 
        ELSE 0 
    END,
    player_type = CASE 
        WHEN fp.player_id IS NOT NULL THEN 'foreign' 
        ELSE 'domestic' 
    END
FROM season_player_registrations spr
LEFT JOIN #ForeignPlayers fp ON spr.player_id = fp.player_id;

-- Step 4: Update player_stats table if it exists
IF OBJECT_ID('dbo.player_stats', 'U') IS NOT NULL
BEGIN
    -- Update player_stats nationality based on players table
    UPDATE ps
    SET ps.nationality = p.nationality,
        ps.updated_at = SYSUTCDATETIME()
    FROM player_stats ps
    INNER JOIN players p ON ps.player_name = p.full_name OR ps.player_name = p.display_name;
END

-- Cleanup temp table
DROP TABLE #ForeignPlayers;

-- Summary report
SELECT 
    'Nationality Update Summary' AS report_type,
    COUNT(*) AS total_players,
    SUM(CASE WHEN nationality = N'Việt Nam' THEN 1 ELSE 0 END) AS vietnamese_players,
    SUM(CASE WHEN nationality <> N'Việt Nam' THEN 1 ELSE 0 END) AS foreign_players
FROM players
WHERE current_team_id IS NOT NULL;

-- Per-team breakdown
SELECT 
    t.name AS team_name,
    COUNT(*) AS total_players,
    SUM(CASE WHEN p.nationality = N'Việt Nam' THEN 1 ELSE 0 END) AS vietnamese_players,
    SUM(CASE WHEN p.nationality <> N'Việt Nam' THEN 1 ELSE 0 END) AS foreign_players
FROM players p
INNER JOIN teams t ON p.current_team_id = t.team_id
GROUP BY t.team_id, t.name
ORDER BY t.name;

PRINT 'Migration completed: Player nationalities updated for demo purposes.';
GO



