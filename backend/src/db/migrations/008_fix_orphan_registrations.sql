-- ============================================================
-- FIX: Delete orphan registrations and related data
-- ============================================================

PRINT '=== Fixing Orphan Player Registrations ===';
PRINT '';

-- STEP 1: Delete match_lineup_players that reference orphan season_player_registrations
PRINT '--- STEP 1: Delete orphan match_lineup_players ---';

DELETE FROM match_lineup_players 
WHERE season_player_id IN (
    SELECT spr.season_player_id
    FROM season_player_registrations spr
    WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.player_id = spr.player_id)
);

PRINT 'Deleted orphan match_lineup_players';
GO

-- STEP 2: Delete orphan season_player_registrations
PRINT '--- STEP 2: Delete orphan season_player_registrations ---';

DELETE FROM season_player_registrations 
WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.player_id = season_player_registrations.player_id);

PRINT 'Deleted orphan season_player_registrations';
GO

-- STEP 3: Add FK constraint
PRINT '--- STEP 3: Add FK constraint to players ---';

-- Check if FK already exists
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_season_player_reg_player')
BEGIN
    ALTER TABLE season_player_registrations 
    ADD CONSTRAINT FK_season_player_reg_player FOREIGN KEY (player_id) REFERENCES players(player_id);
    PRINT 'Added FK constraint';
END
ELSE PRINT 'FK constraint already exists';
GO

-- STEP 4: Verify
PRINT '--- STEP 4: Verification ---';

SELECT 'season_player_registrations' as tbl, COUNT(*) as count FROM season_player_registrations;
SELECT 'match_lineup_players' as tbl, COUNT(*) as count FROM match_lineup_players;

DECLARE @orphans INT;
SELECT @orphans = COUNT(*) 
FROM season_player_registrations spr
WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.player_id = spr.player_id);

IF @orphans = 0
    PRINT 'OK: No orphan registrations';
ELSE
    PRINT 'WARNING: ' + CAST(@orphans AS VARCHAR) + ' orphan registrations remain';
GO

PRINT '';
PRINT '=== Fix Completed ===';
GO



