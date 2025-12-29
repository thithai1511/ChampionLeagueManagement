-- Migration: Season Registration State Machine
-- Thêm các cột và bảng cần thiết cho workflow đăng ký mùa giải
-- Sử dụng State Machine Pattern: DRAFT_INVITE -> INVITED -> ACCEPTED -> SUBMITTED -> APPROVED
-- REQUIRES: 20250205_full_system_schema.sql to be run first

-- ============================================================
-- PRE-CHECK: Verify required tables exist
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'season_team_registrations')
BEGIN
    PRINT 'ERROR: Table [season_team_registrations] does not exist!';
    PRINT 'Please run 20250205_full_system_schema.sql first from backend/src/data/migrations/';
    RAISERROR('Required table [season_team_registrations] not found. Aborting migration.', 16, 1);
    RETURN;
END
GO

PRINT 'Pre-check passed: Required tables exist';
GO

-- ============================================================
-- PART 1: UPDATE season_team_registrations TABLE
-- ============================================================

PRINT 'Updating season_team_registrations for state machine...';
GO

-- 1. Drop old status constraint
IF EXISTS (
  SELECT * FROM sys.check_constraints 
  WHERE name = 'CK_season_team_reg_status' 
  AND parent_object_id = OBJECT_ID(N'[dbo].[season_team_registrations]')
)
BEGIN
    ALTER TABLE [dbo].[season_team_registrations] DROP CONSTRAINT CK_season_team_reg_status;
    PRINT 'Dropped old CK_season_team_reg_status constraint';
END
GO

-- 2. Normalize existing status values to new state machine format
UPDATE season_team_registrations SET registration_status = 'DRAFT_INVITE' WHERE LOWER(registration_status) = 'draft';
UPDATE season_team_registrations SET registration_status = 'SUBMITTED' WHERE LOWER(registration_status) = 'submitted';
UPDATE season_team_registrations SET registration_status = 'SUBMITTED' WHERE LOWER(registration_status) = 'under_review';
UPDATE season_team_registrations SET registration_status = 'APPROVED' WHERE LOWER(registration_status) = 'approved';
UPDATE season_team_registrations SET registration_status = 'REJECTED' WHERE LOWER(registration_status) = 'rejected';
UPDATE season_team_registrations SET registration_status = 'REQUEST_CHANGE' WHERE LOWER(registration_status) = 'needs_resubmission';
GO

PRINT 'Normalized existing status values';
GO

-- 3. Add new status constraint with state machine statuses
ALTER TABLE [dbo].[season_team_registrations]
ADD CONSTRAINT CK_season_team_reg_status CHECK (
  registration_status IN (
    'DRAFT_INVITE',     -- BTC tạo danh sách dự kiến, chưa gửi
    'INVITED',          -- Đã gửi lời mời, đội chưa phản hồi
    'ACCEPTED',         -- Đội đồng ý tham gia
    'DECLINED',         -- Đội từ chối tham gia
    'SUBMITTED',        -- Đội đã nộp hồ sơ
    'REQUEST_CHANGE',   -- BTC yêu cầu bổ sung/sửa hồ sơ
    'APPROVED',         -- BTC duyệt hồ sơ, đủ điều kiện
    'REJECTED'          -- BTC từ chối hồ sơ, loại đội
  )
);
GO

PRINT 'Added new CK_season_team_reg_status constraint';
GO

-- 4. Add submission_data column for JSON storage
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[season_team_registrations]') 
  AND name = 'submission_data'
)
BEGIN
    ALTER TABLE [dbo].[season_team_registrations]
    ADD [submission_data] NVARCHAR(MAX) NULL;
    PRINT 'Added submission_data column';
END
GO

-- 5. Add reviewer_note column
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[season_team_registrations]') 
  AND name = 'reviewer_note'
)
BEGIN
    ALTER TABLE [dbo].[season_team_registrations]
    ADD [reviewer_note] NVARCHAR(1000) NULL;
    PRINT 'Added reviewer_note column';
END
GO

-- 6. Add invited_at column (khi gửi lời mời)
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[season_team_registrations]') 
  AND name = 'invited_at'
)
BEGIN
    ALTER TABLE [dbo].[season_team_registrations]
    ADD [invited_at] DATETIME2 NULL;
    PRINT 'Added invited_at column';
END
GO

-- 7. Add response_deadline column (hạn phản hồi 2 tuần)
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[season_team_registrations]') 
  AND name = 'response_deadline'
)
BEGIN
    ALTER TABLE [dbo].[season_team_registrations]
    ADD [response_deadline] DATETIME2 NULL;
    PRINT 'Added response_deadline column';
END
GO

-- 8. Add accepted_at column (khi đội chấp nhận)
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[season_team_registrations]') 
  AND name = 'accepted_at'
)
BEGIN
    ALTER TABLE [dbo].[season_team_registrations]
    ADD [accepted_at] DATETIME2 NULL;
    PRINT 'Added accepted_at column';
END
GO

-- 9. Add updated_at column
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[season_team_registrations]') 
  AND name = 'updated_at'
)
BEGIN
    ALTER TABLE [dbo].[season_team_registrations]
    ADD [updated_at] DATETIME2 NULL DEFAULT SYSUTCDATETIME();
    PRINT 'Added updated_at column';
END
GO

-- 10. Add created_at column if missing
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[season_team_registrations]') 
  AND name = 'created_at'
)
BEGIN
    ALTER TABLE [dbo].[season_team_registrations]
    ADD [created_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    PRINT 'Added created_at column';
END
GO

-- ============================================================
-- PART 2: CREATE season_registration_status_history TABLE
-- Audit trail cho mọi thay đổi trạng thái
-- ============================================================

PRINT 'Creating season_registration_status_history table...';
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'season_registration_status_history')
BEGIN
    CREATE TABLE [dbo].[season_registration_status_history] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [registration_id] INT NOT NULL,
      [from_status] VARCHAR(32) NULL,
      [to_status] VARCHAR(32) NOT NULL,
      [changed_by] INT NULL,
      [note] NVARCHAR(1000) NULL,
      [changed_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      
      FOREIGN KEY ([registration_id]) REFERENCES [season_team_registrations]([registration_id]) ON DELETE CASCADE,
      FOREIGN KEY ([changed_by]) REFERENCES [user_accounts]([user_id])
    );
    
    -- Add indexes
    CREATE INDEX IX_season_reg_history_registration 
    ON season_registration_status_history(registration_id, changed_at DESC);
    
    CREATE INDEX IX_season_reg_history_status 
    ON season_registration_status_history(to_status);
    
    PRINT 'season_registration_status_history table created successfully';
END
ELSE
BEGIN
    PRINT 'season_registration_status_history table already exists, skipping creation';
END
GO

-- ============================================================
-- PART 3: ADD INDEXES FOR BETTER QUERY PERFORMANCE
-- ============================================================

PRINT 'Adding indexes...';
GO

-- Index for querying by status
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_season_team_reg_workflow_status')
BEGIN
    CREATE INDEX IX_season_team_reg_workflow_status 
    ON season_team_registrations(season_id, registration_status);
    PRINT 'Created IX_season_team_reg_workflow_status index';
END
GO

-- Index for deadline checks
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_season_team_reg_deadline')
BEGIN
    CREATE INDEX IX_season_team_reg_deadline 
    ON season_team_registrations(registration_status, response_deadline)
    WHERE registration_status = 'INVITED';
    PRINT 'Created IX_season_team_reg_deadline index';
END
GO

-- ============================================================
-- PART 4: ADD disciplinary_records TABLE (for suspension tracking)
-- Bảng này cần để check cầu thủ bị treo giò
-- ============================================================

PRINT 'Checking disciplinary_records table...';
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'disciplinary_records')
BEGIN
    CREATE TABLE [dbo].[disciplinary_records] (
      [record_id] INT IDENTITY(1,1) PRIMARY KEY,
      [season_id] INT NOT NULL,
      [player_id] INT NOT NULL,
      [match_id] INT NULL,
      [offense_type] VARCHAR(50) NOT NULL, -- 'yellow_card', 'red_card', 'direct_red', 'misconduct'
      [offense_date] DATETIME2 NOT NULL,
      [yellow_card_count] INT NOT NULL DEFAULT 0,
      [red_card_count] INT NOT NULL DEFAULT 0,
      [is_suspended] BIT NOT NULL DEFAULT 0,
      [suspension_matches] INT NULL DEFAULT 0,
      [suspension_start_date] DATETIME2 NULL,
      [suspension_end_date] DATETIME2 NULL,
      [notes] NVARCHAR(500) NULL,
      [created_by] INT NULL,
      [created_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      
      FOREIGN KEY ([season_id]) REFERENCES [seasons]([season_id]) ON DELETE CASCADE,
      FOREIGN KEY ([player_id]) REFERENCES [players]([player_id]),
      FOREIGN KEY ([match_id]) REFERENCES [matches]([match_id]),
      FOREIGN KEY ([created_by]) REFERENCES [user_accounts]([user_id]),
      
      CONSTRAINT CK_disciplinary_offense_type CHECK (
        offense_type IN ('yellow_card', 'red_card', 'direct_red', 'second_yellow', 'misconduct', 'other')
      )
    );
    
    -- Add indexes
    CREATE INDEX IX_disciplinary_player_season 
    ON disciplinary_records(player_id, season_id, is_suspended);
    
    CREATE INDEX IX_disciplinary_suspended 
    ON disciplinary_records(season_id, is_suspended, suspension_end_date)
    WHERE is_suspended = 1;
    
    PRINT 'disciplinary_records table created successfully';
END
ELSE
BEGIN
    -- Ensure is_suspended column exists
    IF NOT EXISTS (
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID(N'[dbo].[disciplinary_records]') 
      AND name = 'is_suspended'
    )
    BEGIN
        ALTER TABLE [dbo].[disciplinary_records]
        ADD [is_suspended] BIT NOT NULL DEFAULT 0;
        PRINT 'Added is_suspended column to disciplinary_records';
    END
    
    IF NOT EXISTS (
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID(N'[dbo].[disciplinary_records]') 
      AND name = 'suspension_end_date'
    )
    BEGIN
        ALTER TABLE [dbo].[disciplinary_records]
        ADD [suspension_end_date] DATETIME2 NULL;
        PRINT 'Added suspension_end_date column to disciplinary_records';
    END
    
    PRINT 'disciplinary_records table already exists, checked for updates';
END
GO

-- ============================================================
-- PART 5: UPDATE matches TABLE - Add lineup status columns
-- Thêm cột để track trạng thái lineup của từng đội
-- ============================================================

PRINT 'Adding lineup status columns to matches...';
GO

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[matches]') 
  AND name = 'home_lineup_status'
)
BEGIN
    ALTER TABLE [dbo].[matches]
    ADD [home_lineup_status] VARCHAR(20) NULL DEFAULT 'PENDING'
    CHECK (home_lineup_status IN ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED'));
    PRINT 'Added home_lineup_status column';
END
GO

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[matches]') 
  AND name = 'away_lineup_status'
)
BEGIN
    ALTER TABLE [dbo].[matches]
    ADD [away_lineup_status] VARCHAR(20) NULL DEFAULT 'PENDING'
    CHECK (away_lineup_status IN ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED'));
    PRINT 'Added away_lineup_status column';
END
GO

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[matches]') 
  AND name = 'main_referee_id'
)
BEGIN
    ALTER TABLE [dbo].[matches]
    ADD [main_referee_id] INT NULL;
    PRINT 'Added main_referee_id column';
END
GO

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[matches]') 
  AND name = 'supervisor_id'
)
BEGIN
    ALTER TABLE [dbo].[matches]
    ADD [supervisor_id] INT NULL;
    PRINT 'Added supervisor_id column';
END
GO

-- ============================================================
-- PART 6: DATA INITIALIZATION
-- ============================================================

PRINT 'Initializing data...';
GO

-- Set default status for registrations without proper status
UPDATE season_team_registrations 
SET registration_status = 'DRAFT_INVITE' 
WHERE registration_status IS NULL OR registration_status = '';
GO

-- Set updated_at for existing records
UPDATE season_team_registrations 
SET updated_at = SYSUTCDATETIME() 
WHERE updated_at IS NULL;
GO

-- Set default lineup status for existing matches
UPDATE matches 
SET home_lineup_status = 'PENDING', away_lineup_status = 'PENDING'
WHERE home_lineup_status IS NULL;
GO

PRINT 'Migration 004 completed successfully!';
GO

-- ============================================================
-- VERIFICATION QUERIES (Uncomment to test)
-- ============================================================

/*
-- Check season_team_registrations columns
SELECT 
    COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'season_team_registrations'
ORDER BY ORDINAL_POSITION;

-- Check new history table
SELECT * FROM season_registration_status_history;

-- Check registration statuses
SELECT registration_status, COUNT(*) as count 
FROM season_team_registrations 
GROUP BY registration_status;

-- Check matches lineup status
SELECT TOP 5 match_id, status, home_lineup_status, away_lineup_status 
FROM matches;
*/

