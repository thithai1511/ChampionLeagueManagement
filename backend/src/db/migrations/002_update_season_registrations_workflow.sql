-- Migration: Update season_team_registrations for new workflow
-- Adds new status columns and submission_data for comprehensive team registration workflow

-- Add submission_data column to store team submission (stadium, kits, players, etc.)
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[season_team_registrations]') 
  AND name = 'submission_data'
)
BEGIN
    ALTER TABLE [dbo].[season_team_registrations]
    ADD [submission_data] NVARCHAR(MAX) NULL;
END
GO

-- Add reviewer_note column (replaces review_notes for consistency)
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[season_team_registrations]') 
  AND name = 'reviewer_note'
)
BEGIN
    ALTER TABLE [dbo].[season_team_registrations]
    ADD [reviewer_note] NVARCHAR(MAX) NULL;
END
GO

-- Update existing registration_status constraint to include new workflow statuses
-- Drop existing constraint if it exists
IF EXISTS (
  SELECT * FROM sys.check_constraints 
  WHERE name = 'CK_season_team_reg_status' 
  AND parent_object_id = OBJECT_ID(N'[dbo].[season_team_registrations]')
)
BEGIN
    ALTER TABLE [dbo].[season_team_registrations] 
    DROP CONSTRAINT CK_season_team_reg_status;
END
GO

-- Add updated constraint with new workflow statuses
-- New statuses: DRAFT_INVITE, INVITED, ACCEPTED, DECLINED, SUBMITTED, REQUEST_CHANGE, APPROVED, REJECTED
ALTER TABLE [dbo].[season_team_registrations]
ADD CONSTRAINT CK_season_team_reg_status CHECK (
  registration_status IN (
    'DRAFT_INVITE',      -- BTC created draft, not sent yet
    'INVITED',           -- Invitation sent to team
    'ACCEPTED',          -- Team accepted invitation
    'DECLINED',          -- Team declined invitation
    'SUBMITTED',         -- Team submitted registration documents
    'REQUEST_CHANGE',    -- BTC requests changes to submission
    'APPROVED',          -- BTC approved submission
    'REJECTED',          -- BTC rejected submission
    -- Legacy statuses (keep for backward compatibility)
    'draft',
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'needs_resubmission'
  )
);
GO

-- Add indexes for performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_season_team_reg_status_season')
BEGIN
    CREATE INDEX IX_season_team_reg_status_season 
    ON [dbo].[season_team_registrations](season_id, registration_status);
END
GO

-- Add created_at and updated_at for audit trail
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[season_team_registrations]') 
  AND name = 'created_at'
)
BEGIN
    ALTER TABLE [dbo].[season_team_registrations]
    ADD [created_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
END
GO

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[season_team_registrations]') 
  AND name = 'updated_at'
)
BEGIN
    ALTER TABLE [dbo].[season_team_registrations]
    ADD [updated_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
END
GO

-- Create trigger to update updated_at timestamp
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_season_team_reg_updated')
BEGIN
    DROP TRIGGER TR_season_team_reg_updated;
END
GO

CREATE TRIGGER TR_season_team_reg_updated
ON [dbo].[season_team_registrations]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [dbo].[season_team_registrations]
    SET updated_at = SYSUTCDATETIME()
    FROM [dbo].[season_team_registrations] r
    INNER JOIN inserted i ON r.registration_id = i.registration_id;
END
GO

-- Create audit table for status changes
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'season_registration_status_history')
BEGIN
    CREATE TABLE [dbo].[season_registration_status_history] (
        history_id INT IDENTITY(1,1) PRIMARY KEY,
        registration_id INT NOT NULL,
        from_status VARCHAR(32) NULL,
        to_status VARCHAR(32) NOT NULL,
        changed_by INT NULL REFERENCES user_accounts(user_id),
        changed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        note NVARCHAR(MAX) NULL,
        FOREIGN KEY (registration_id) REFERENCES season_team_registrations(registration_id) ON DELETE CASCADE
    );
    
    CREATE INDEX IX_registration_status_history 
    ON [dbo].[season_registration_status_history](registration_id, changed_at DESC);
END
GO

-- Migrate existing data to new statuses
UPDATE [dbo].[season_team_registrations]
SET registration_status = CASE registration_status
    WHEN 'draft' THEN 'DRAFT_INVITE'
    WHEN 'submitted' THEN 'SUBMITTED'
    WHEN 'under_review' THEN 'SUBMITTED'
    WHEN 'approved' THEN 'APPROVED'
    WHEN 'rejected' THEN 'REJECTED'
    WHEN 'needs_resubmission' THEN 'REQUEST_CHANGE'
    ELSE registration_status
END
WHERE registration_status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'needs_resubmission');
GO

PRINT 'Migration 002: season_team_registrations workflow update completed successfully';
