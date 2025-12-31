-- Migration 019: Enhance match_reports table for referee reporting
-- Adds MVP, goals, cards details fields

PRINT 'Enhancing match_reports table for referee reporting...';
GO

-- Add MVP fields
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_reports') AND name = 'mvp_player_id')
BEGIN
    ALTER TABLE match_reports ADD mvp_player_id INT NULL;
    PRINT 'Added mvp_player_id column';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_reports') AND name = 'mvp_player_name')
BEGIN
    ALTER TABLE match_reports ADD mvp_player_name NVARCHAR(200) NULL;
    PRINT 'Added mvp_player_name column';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_reports') AND name = 'mvp_team_name')
BEGIN
    ALTER TABLE match_reports ADD mvp_team_name NVARCHAR(200) NULL;
    PRINT 'Added mvp_team_name column';
END
GO

-- Add score fields
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_reports') AND name = 'home_score')
BEGIN
    ALTER TABLE match_reports ADD home_score TINYINT NULL;
    PRINT 'Added home_score column';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_reports') AND name = 'away_score')
BEGIN
    ALTER TABLE match_reports ADD away_score TINYINT NULL;
    PRINT 'Added away_score column';
END
GO

-- Add card count fields
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_reports') AND name = 'total_yellow_cards')
BEGIN
    ALTER TABLE match_reports ADD total_yellow_cards TINYINT NULL;
    PRINT 'Added total_yellow_cards column';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_reports') AND name = 'total_red_cards')
BEGIN
    ALTER TABLE match_reports ADD total_red_cards TINYINT NULL;
    PRINT 'Added total_red_cards column';
END
GO

-- Add JSON fields for detailed goals and cards
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_reports') AND name = 'goal_details')
BEGIN
    ALTER TABLE match_reports ADD goal_details NVARCHAR(MAX) NULL;
    PRINT 'Added goal_details column (JSON)';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_reports') AND name = 'card_details')
BEGIN
    ALTER TABLE match_reports ADD card_details NVARCHAR(MAX) NULL;
    PRINT 'Added card_details column (JSON)';
END
GO

-- Add referee_report_submitted and referee_report_at to matches if not exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('matches') AND name = 'referee_report_submitted')
BEGIN
    ALTER TABLE matches ADD referee_report_submitted BIT DEFAULT 0;
    PRINT 'Added referee_report_submitted column to matches table';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('matches') AND name = 'referee_report_at')
BEGIN
    ALTER TABLE matches ADD referee_report_at DATETIME2 NULL;
    PRINT 'Added referee_report_at column to matches table';
END
GO

PRINT 'Migration 019 completed successfully!';
GO

