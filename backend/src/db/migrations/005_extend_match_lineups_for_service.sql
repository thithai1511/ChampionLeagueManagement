-- Migration: Extend match_lineups table for matchLineupService compatibility
-- Service cần các cột: match_lineup_id, player_id, is_starting, is_captain, status, etc.
-- Schema gốc có cấu trúc khác, cần thêm cột để tương thích
-- REQUIRES: 20250205_full_system_schema.sql to be run first

-- ============================================================
-- PRE-CHECK: Verify required tables exist
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'match_lineups')
BEGIN
    PRINT 'ERROR: Table [match_lineups] does not exist!';
    PRINT 'Please run 20250205_full_system_schema.sql first from backend/src/data/migrations/';
    RAISERROR('Required table [match_lineups] not found. Aborting migration.', 16, 1);
    RETURN;
END
GO

PRINT 'Pre-check passed: Required tables exist';
GO

-- ============================================================
-- PART 1: ADD MISSING COLUMNS TO match_lineups
-- ============================================================

PRINT 'Extending match_lineups table for service compatibility...';
GO

-- Check if we have the simplified schema (with player_id directly in match_lineups)
-- or the normalized schema (with match_lineup_players table)

-- Add player_id column if not exists
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[match_lineups]') 
  AND name = 'player_id'
)
BEGIN
    ALTER TABLE [dbo].[match_lineups]
    ADD [player_id] INT NULL;
    PRINT 'Added player_id column to match_lineups';
END
GO

-- Add match_lineup_id alias (if primary key is named differently)
-- The service expects match_lineup_id but schema has lineup_id
-- We'll create a computed column or view if needed

-- Add is_starting column
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[match_lineups]') 
  AND name = 'is_starting'
)
BEGIN
    ALTER TABLE [dbo].[match_lineups]
    ADD [is_starting] BIT NOT NULL DEFAULT 1;
    PRINT 'Added is_starting column to match_lineups';
END
GO

-- Add is_captain column
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[match_lineups]') 
  AND name = 'is_captain'
)
BEGIN
    ALTER TABLE [dbo].[match_lineups]
    ADD [is_captain] BIT NOT NULL DEFAULT 0;
    PRINT 'Added is_captain column to match_lineups';
END
GO

-- Add jersey_number column
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[match_lineups]') 
  AND name = 'jersey_number'
)
BEGIN
    ALTER TABLE [dbo].[match_lineups]
    ADD [jersey_number] TINYINT NULL;
    PRINT 'Added jersey_number column to match_lineups';
END
GO

-- Add position column
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[match_lineups]') 
  AND name = 'position'
)
BEGIN
    ALTER TABLE [dbo].[match_lineups]
    ADD [position] VARCHAR(32) NULL;
    PRINT 'Added position column to match_lineups';
END
GO

-- Add minutes_played column
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[match_lineups]') 
  AND name = 'minutes_played'
)
BEGIN
    ALTER TABLE [dbo].[match_lineups]
    ADD [minutes_played] SMALLINT NULL;
    PRINT 'Added minutes_played column to match_lineups';
END
GO

-- Add updated_at column
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[match_lineups]') 
  AND name = 'updated_at'
)
BEGIN
    ALTER TABLE [dbo].[match_lineups]
    ADD [updated_at] DATETIME NULL;
    PRINT 'Added updated_at column to match_lineups';
END
GO

-- ============================================================
-- PART 2: CREATE VIEW for backward compatibility
-- Nếu cần alias match_lineup_id từ lineup_id
-- ============================================================

-- Check if we need to create alias view
IF EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[match_lineups]') 
  AND name = 'lineup_id'
)
AND NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[match_lineups]') 
  AND name = 'match_lineup_id'
)
BEGIN
    PRINT 'Creating view vw_match_lineups_extended with match_lineup_id alias...';
    
    EXEC('
    CREATE OR ALTER VIEW vw_match_lineups_extended AS
    SELECT 
        lineup_id as match_lineup_id,
        match_id,
        season_id,
        season_team_id,
        player_id,
        jersey_number,
        position,
        is_starting,
        is_captain,
        minutes_played,
        team_type,
        approval_status,
        submitted_at,
        approved_by,
        approved_at,
        rejection_reason,
        status,
        updated_at
    FROM match_lineups
    ');
    
    PRINT 'Created vw_match_lineups_extended view';
END
GO

-- ============================================================
-- PART 3: ADD INDEX for player lookup
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_match_lineups_player')
BEGIN
    CREATE INDEX IX_match_lineups_player 
    ON match_lineups(match_id, player_id);
    PRINT 'Created IX_match_lineups_player index';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_match_lineups_season_team')
BEGIN
    CREATE INDEX IX_match_lineups_season_team 
    ON match_lineups(match_id, season_team_id);
    PRINT 'Created IX_match_lineups_season_team index';
END
GO

PRINT 'Migration 005 completed successfully!';
GO

-- ============================================================
-- VERIFICATION QUERIES (Uncomment to test)
-- ============================================================

/*
-- Check match_lineups columns
SELECT 
    COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'match_lineups'
ORDER BY ORDINAL_POSITION;

-- Test query matching service expectation
SELECT TOP 5
    lineup_id as match_lineup_id,
    match_id,
    season_id,
    season_team_id,
    player_id,
    is_starting,
    is_captain,
    status
FROM match_lineups;
*/

