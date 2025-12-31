-- Migration 021: Add review_status and review_feedback columns to supervisor_reports
-- Supports: approve, rejected, request_changes actions

PRINT 'Adding review_status and review_feedback columns to supervisor_reports...';
GO

-- Add review_status column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('supervisor_reports') AND name = 'review_status')
BEGIN
    ALTER TABLE supervisor_reports ADD review_status VARCHAR(30) NULL;
    PRINT 'Added review_status column';
END
GO

-- Add review_feedback column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('supervisor_reports') AND name = 'review_feedback')
BEGIN
    ALTER TABLE supervisor_reports ADD review_feedback NVARCHAR(MAX) NULL;
    PRINT 'Added review_feedback column';
END
GO

-- Also add to match_reports if needed
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'match_reports')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_reports') AND name = 'review_status')
    BEGIN
        ALTER TABLE match_reports ADD review_status VARCHAR(30) NULL;
        PRINT 'Added review_status column to match_reports';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_reports') AND name = 'review_feedback')
    BEGIN
        ALTER TABLE match_reports ADD review_feedback NVARCHAR(MAX) NULL;
        PRINT 'Added review_feedback column to match_reports';
    END
END
GO

PRINT 'Migration 021 completed successfully!';
GO

