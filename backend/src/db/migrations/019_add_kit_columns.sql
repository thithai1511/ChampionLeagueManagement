-- Migration: Add Kit Columns to Teams and Matches
-- Description: Adds kit color/image columns to teams table and kit selection columns to matches table

-- ============================================================
-- 1. ADD KIT COLUMNS TO TEAMS TABLE
-- ============================================================
PRINT 'Adding kit columns to teams table...';
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[teams]') AND name = 'home_kit_color')
BEGIN
    ALTER TABLE [dbo].[teams]
    ADD [home_kit_color] NVARCHAR(50) NULL;
    PRINT 'Added home_kit_color';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[teams]') AND name = 'away_kit_color')
BEGIN
    ALTER TABLE [dbo].[teams]
    ADD [away_kit_color] NVARCHAR(50) NULL;
    PRINT 'Added away_kit_color';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[teams]') AND name = 'home_kit_image')
BEGIN
    ALTER TABLE [dbo].[teams]
    ADD [home_kit_image] NVARCHAR(500) NULL;
    PRINT 'Added home_kit_image';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[teams]') AND name = 'away_kit_image')
BEGIN
    ALTER TABLE [dbo].[teams]
    ADD [away_kit_image] NVARCHAR(500) NULL;
    PRINT 'Added away_kit_image';
END
GO

-- ============================================================
-- 2. ADD KIT SELECTION COLUMNS TO MATCHES TABLE
-- ============================================================
PRINT 'Adding kit selection columns to matches table...';
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[matches]') AND name = 'home_team_kit')
BEGIN
    ALTER TABLE [dbo].[matches]
    ADD [home_team_kit] VARCHAR(20) DEFAULT 'home' WITH VALUES;
    -- Add check constraint
    ALTER TABLE [dbo].[matches]
    ADD CONSTRAINT CK_matches_home_team_kit CHECK (home_team_kit IN ('home', 'away', 'third'));
    PRINT 'Added home_team_kit';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[matches]') AND name = 'away_team_kit')
BEGIN
    ALTER TABLE [dbo].[matches]
    ADD [away_team_kit] VARCHAR(20) DEFAULT 'away' WITH VALUES;
    -- Add check constraint
    ALTER TABLE [dbo].[matches]
    ADD CONSTRAINT CK_matches_away_team_kit CHECK (away_team_kit IN ('home', 'away', 'third'));
    PRINT 'Added away_team_kit';
END
GO

PRINT 'Migration 019_add_kit_columns completed successfully!';
