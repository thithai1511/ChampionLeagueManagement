-- ============================================================
-- MIGRATION: Migrate FootballPlayers to players, cleanup Football* tables
-- 
-- Quy trình:
-- 1. Thêm cột mapping vào players để track FootballPlayers.id
-- 2. Copy 675 cầu thủ đang dùng từ FootballPlayers → players
-- 3. Cập nhật season_player_registrations FK sang players
-- 4. Xóa 713 cầu thủ không dùng
-- 5. Xóa các bảng Football*
-- ============================================================

PRINT '=== Starting Football* to Internal Migration ===';
PRINT '';

-- ============================================================
-- STEP 1: Add mapping column to players table
-- ============================================================

PRINT '--- STEP 1: Add mapping column ---';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('players') AND name = 'legacy_football_player_id')
BEGIN
    ALTER TABLE players ADD legacy_football_player_id INT NULL;
    PRINT 'Added: legacy_football_player_id to players';
END
ELSE PRINT 'Exists: legacy_football_player_id';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('players') AND name = 'external_key')
BEGIN
    ALTER TABLE players ADD external_key NVARCHAR(100) NULL;
    PRINT 'Added: external_key to players';
END
ELSE PRINT 'Exists: external_key';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('players') AND name = 'shirt_number')
BEGIN
    ALTER TABLE players ADD shirt_number INT NULL;
    PRINT 'Added: shirt_number to players';
END
ELSE PRINT 'Exists: shirt_number';
GO

-- ============================================================
-- STEP 2: Copy players used in season_player_registrations
-- ============================================================

PRINT '--- STEP 2: Migrate players used in registrations ---';

-- Insert only players that are in season_player_registrations and not already migrated
INSERT INTO players (
    full_name,
    display_name,
    date_of_birth,
    nationality,
    preferred_position,
    current_team_id,
    avatar_url,
    legacy_football_player_id,
    external_key,
    shirt_number,
    created_at
)
SELECT 
    fp.name,
    fp.name,
    fp.date_of_birth,
    fp.nationality,
    fp.position,
    fp.internal_team_id,
    fp.avatar_url,
    fp.id,
    fp.external_key,
    fp.shirt_number,
    fp.created_at
FROM FootballPlayers fp
WHERE fp.id IN (SELECT DISTINCT player_id FROM season_player_registrations)
  AND fp.id NOT IN (SELECT legacy_football_player_id FROM players WHERE legacy_football_player_id IS NOT NULL);

PRINT 'Migrated players from FootballPlayers to players';
GO

-- ============================================================
-- STEP 3: Update season_player_registrations FK
-- ============================================================

PRINT '--- STEP 3: Update season_player_registrations FK ---';

-- First, drop the existing FK constraint
DECLARE @fkName NVARCHAR(256);
SELECT @fkName = fk.name
FROM sys.foreign_keys fk
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
WHERE OBJECT_NAME(fk.parent_object_id) = 'season_player_registrations'
  AND c.name = 'player_id';

IF @fkName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE season_player_registrations DROP CONSTRAINT ' + @fkName);
    PRINT 'Dropped FK constraint: ' + @fkName;
END
GO

-- Update player_id to point to new players table
UPDATE spr
SET spr.player_id = p.player_id
FROM season_player_registrations spr
INNER JOIN players p ON p.legacy_football_player_id = spr.player_id;

PRINT 'Updated season_player_registrations.player_id to reference players table';
GO

-- Add new FK constraint to players table
ALTER TABLE season_player_registrations 
ADD CONSTRAINT FK_season_player_reg_player FOREIGN KEY (player_id) REFERENCES players(player_id);

PRINT 'Added new FK constraint to players table';
GO

-- ============================================================
-- STEP 4: Verify migration
-- ============================================================

PRINT '--- STEP 4: Verification ---';

SELECT 'players table count' as info, COUNT(*) as count FROM players;
SELECT 'season_player_registrations count' as info, COUNT(*) as count FROM season_player_registrations;

-- Check if all registrations point to valid players
DECLARE @orphans INT;
SELECT @orphans = COUNT(*) 
FROM season_player_registrations spr
WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.player_id = spr.player_id);

IF @orphans > 0
BEGIN
    PRINT 'ERROR: ' + CAST(@orphans AS VARCHAR) + ' orphan registrations found!';
    RAISERROR('Migration failed - orphan registrations exist', 16, 1);
    RETURN;
END
ELSE
    PRINT 'OK: All registrations point to valid players';
GO

-- ============================================================
-- STEP 5: Drop Football* tables
-- ============================================================

PRINT '--- STEP 5: Drop Football* tables ---';

-- Drop in correct order (children first)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'FootballTeamCompetitions')
BEGIN
    DROP TABLE FootballTeamCompetitions;
    PRINT 'Dropped: FootballTeamCompetitions';
END

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'FootballStandings')
BEGIN
    DROP TABLE FootballStandings;
    PRINT 'Dropped: FootballStandings';
END

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'FootballMatches')
BEGIN
    DROP TABLE FootballMatches;
    PRINT 'Dropped: FootballMatches';
END

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'FootballPlayers')
BEGIN
    DROP TABLE FootballPlayers;
    PRINT 'Dropped: FootballPlayers';
END

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'FootballTeams')
BEGIN
    DROP TABLE FootballTeams;
    PRINT 'Dropped: FootballTeams';
END
GO

PRINT '';
PRINT '=== Migration Completed Successfully! ===';
PRINT '';
PRINT 'NEXT STEPS:';
PRINT '1. Update backend services to use "players" instead of "FootballPlayers"';
PRINT '2. Restart backend server';
PRINT '3. Test player-related features';
GO

-- Final verification
SELECT 'Final tables' as info, name FROM sys.tables WHERE name LIKE 'Football%' OR name = 'players' ORDER BY name;
GO

