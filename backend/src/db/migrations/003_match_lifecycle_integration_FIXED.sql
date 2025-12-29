-- Migration: Match Lifecycle Integration (Fixed - No Conflicts)
-- This migration integrates match lifecycle workflow with existing schema
-- DOES NOT create duplicate tables
-- REQUIRES: 20250205_full_system_schema.sql to be run first

-- ============================================================
-- PRE-CHECK: Verify required tables exist
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'matches')
BEGIN
    PRINT 'ERROR: Table [matches] does not exist!';
    PRINT 'Please run 20250205_full_system_schema.sql first from backend/src/data/migrations/';
    RAISERROR('Required table [matches] not found. Aborting migration.', 16, 1);
    RETURN;
END
GO

PRINT 'Pre-check passed: Required tables exist';
GO

-- ============================================================
-- PART 1: UPDATE MATCHES TABLE
-- ============================================================

-- 1. Update status constraint to include new lifecycle statuses
PRINT 'Updating matches status constraint...';
GO

IF EXISTS (
  SELECT * FROM sys.check_constraints 
  WHERE name = 'CK_matches_status' 
  AND parent_object_id = OBJECT_ID(N'[dbo].[matches]')
)
BEGIN
    ALTER TABLE [dbo].[matches] DROP CONSTRAINT CK_matches_status;
END
GO

-- Normalize existing status values to UPPERCASE
UPDATE matches SET status = 'SCHEDULED' WHERE LOWER(status) = 'scheduled';
UPDATE matches SET status = 'IN_PROGRESS' WHERE LOWER(status) = 'in_progress';
UPDATE matches SET status = 'COMPLETED' WHERE LOWER(status) = 'completed';
UPDATE matches SET status = 'POSTPONED' WHERE LOWER(status) = 'postponed';
UPDATE matches SET status = 'CANCELLED' WHERE LOWER(status) = 'cancelled';
GO

-- Add new constraint with all lifecycle statuses
ALTER TABLE [dbo].[matches]
ADD CONSTRAINT CK_matches_status CHECK (
  status IN (
    -- New lifecycle statuses
    'SCHEDULED',       -- Đã lên lịch (was 'scheduled')
    'PREPARING',       -- Đã phân công trọng tài, chờ lineup
    'READY',           -- Cả 2 đội đã nộp lineup được duyệt
    'IN_PROGRESS',     -- Đang thi đấu (was 'in_progress')
    'FINISHED',        -- Trận đấu kết thúc
    'REPORTED',        -- Trọng tài & Giám sát đã báo cáo
    'COMPLETED',       -- BTC xác nhận xong kết quả (was 'completed')
    -- Legacy statuses
    'POSTPONED',       -- (was 'postponed')
    'CANCELLED',       -- (was 'cancelled')
    'AWARDED'          -- (was 'awarded')
  )
);
GO

-- 2. Add lifecycle tracking columns to matches
PRINT 'Adding lifecycle tracking columns to matches...';
GO

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[matches]') 
  AND name = 'officials_assigned_at'
)
BEGIN
    ALTER TABLE [dbo].[matches]
    ADD [officials_assigned_at] DATETIME NULL;
END
GO

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[matches]') 
  AND name = 'lineups_approved_at'
)
BEGIN
    ALTER TABLE [dbo].[matches]
    ADD [lineups_approved_at] DATETIME NULL;
END
GO

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[matches]') 
  AND name = 'started_at'
)
BEGIN
    ALTER TABLE [dbo].[matches]
    ADD [started_at] DATETIME NULL;
END
GO

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[matches]') 
  AND name = 'finished_at'
)
BEGIN
    ALTER TABLE [dbo].[matches]
    ADD [finished_at] DATETIME NULL;
END
GO

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[matches]') 
  AND name = 'reports_completed_at'
)
BEGIN
    ALTER TABLE [dbo].[matches]
    ADD [reports_completed_at] DATETIME NULL;
END
GO

-- 3. Add report submission tracking flags
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[matches]') 
  AND name = 'referee_report_submitted'
)
BEGIN
    ALTER TABLE [dbo].[matches]
    ADD [referee_report_submitted] BIT DEFAULT 0;
END
GO

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[matches]') 
  AND name = 'supervisor_report_submitted'
)
BEGIN
    ALTER TABLE [dbo].[matches]
    ADD [supervisor_report_submitted] BIT DEFAULT 0;
END
GO

-- ============================================================
-- PART 2: EXTEND MATCH_LINEUPS TABLE (Already exists)
-- ============================================================

PRINT 'Extending match_lineups table for approval workflow...';
GO

-- Add approval workflow columns
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[match_lineups]') 
  AND name = 'team_type'
)
BEGIN
    ALTER TABLE [dbo].[match_lineups]
    ADD [team_type] VARCHAR(10) NULL CHECK (team_type IN ('home', 'away'));
END
GO

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[match_lineups]') 
  AND name = 'approval_status'
)
BEGIN
    ALTER TABLE [dbo].[match_lineups]
    ADD [approval_status] VARCHAR(20) DEFAULT 'PENDING' 
    CHECK (approval_status IN ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED'));
END
GO

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[match_lineups]') 
  AND name = 'submitted_at'
)
BEGIN
    ALTER TABLE [dbo].[match_lineups]
    ADD [submitted_at] DATETIME NULL;
END
GO

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[match_lineups]') 
  AND name = 'approved_by'
)
BEGIN
    ALTER TABLE [dbo].[match_lineups]
    ADD [approved_by] INT NULL;
END
GO

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[match_lineups]') 
  AND name = 'approved_at'
)
BEGIN
    ALTER TABLE [dbo].[match_lineups]
    ADD [approved_at] DATETIME NULL;
END
GO

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[match_lineups]') 
  AND name = 'rejection_reason'
)
BEGIN
    ALTER TABLE [dbo].[match_lineups]
    ADD [rejection_reason] NVARCHAR(500) NULL;
END
GO

-- Add index for team_type queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_match_lineups_team_type')
BEGIN
    CREATE INDEX IX_match_lineups_team_type 
    ON match_lineups(match_id, team_type, approval_status);
END
GO

-- ============================================================
-- PART 3: EXTEND MATCH_OFFICIAL_ASSIGNMENTS TABLE
-- ============================================================

PRINT 'Adding supervisor role to match_official_assignments...';
GO

-- Drop existing constraint if exists
IF EXISTS (
  SELECT * FROM sys.check_constraints 
  WHERE name = 'CK_match_official_assignments_role'
  AND parent_object_id = OBJECT_ID(N'[dbo].[match_official_assignments]')
)
BEGIN
    ALTER TABLE [dbo].[match_official_assignments] 
    DROP CONSTRAINT CK_match_official_assignments_role;
END
GO

-- Add constraint with supervisor role
ALTER TABLE [dbo].[match_official_assignments]
ADD CONSTRAINT CK_match_official_assignments_role CHECK (
  official_role IN (
    'referee', 
    'assistant_referee', 
    'fourth_official', 
    'video_assistant_referee',
    'supervisor'  -- NEW ROLE
  )
);
GO

-- ============================================================
-- PART 4: NEW TABLE - SUPERVISOR_REPORTS
-- ============================================================

PRINT 'Creating supervisor_reports table...';
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'supervisor_reports')
BEGIN
    CREATE TABLE [dbo].[supervisor_reports] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [match_id] INT NOT NULL UNIQUE,
      [supervisor_id] INT NOT NULL,
      
      -- Ratings (1-10 scale)
      [organization_rating] INT NULL CHECK (organization_rating BETWEEN 1 AND 10),
      [home_team_rating] INT NULL CHECK (home_team_rating BETWEEN 1 AND 10),
      [away_team_rating] INT NULL CHECK (away_team_rating BETWEEN 1 AND 10),
      [stadium_condition_rating] INT NULL CHECK (stadium_condition_rating BETWEEN 1 AND 10),
      [security_rating] INT NULL CHECK (security_rating BETWEEN 1 AND 10),
      
      -- Incident reporting
      [incident_report] NVARCHAR(MAX) NULL,
      [has_serious_violation] BIT DEFAULT 0,
      [send_to_disciplinary] BIT DEFAULT 0,
      [recommendations] NVARCHAR(MAX) NULL,
      
      -- Review tracking
      [reviewed_by] INT NULL,
      [reviewed_at] DATETIME NULL,
      [review_notes] NVARCHAR(1000) NULL,
      
      [submitted_at] DATETIME DEFAULT GETDATE(),
      [created_at] DATETIME DEFAULT GETDATE(),
      
      FOREIGN KEY ([match_id]) REFERENCES [matches]([match_id]) ON DELETE CASCADE,
      FOREIGN KEY ([supervisor_id]) REFERENCES [user_accounts]([user_id]),
      FOREIGN KEY ([reviewed_by]) REFERENCES [user_accounts]([user_id])
    );
    
    -- Add indexes
    CREATE INDEX IX_supervisor_reports_match ON supervisor_reports(match_id);
    CREATE INDEX IX_supervisor_reports_supervisor ON supervisor_reports(supervisor_id);
    CREATE INDEX IX_supervisor_reports_disciplinary ON supervisor_reports(send_to_disciplinary, has_serious_violation);
    
    PRINT 'supervisor_reports table created successfully';
END
ELSE
BEGIN
    PRINT 'supervisor_reports table already exists, skipping creation';
END
GO

-- ============================================================
-- PART 5: NEW TABLE - MATCH_LIFECYCLE_HISTORY (Audit Trail)
-- ============================================================

PRINT 'Creating match_lifecycle_history table...';
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'match_lifecycle_history')
BEGIN
    CREATE TABLE [dbo].[match_lifecycle_history] (
      [id] INT IDENTITY(1,1) PRIMARY KEY,
      [match_id] INT NOT NULL,
      [from_status] VARCHAR(20) NULL,
      [to_status] VARCHAR(20) NOT NULL,
      [changed_by] INT NULL,
      [change_note] NVARCHAR(500) NULL,
      [changed_at] DATETIME DEFAULT GETDATE(),
      
      FOREIGN KEY ([match_id]) REFERENCES [matches]([match_id]) ON DELETE CASCADE,
      FOREIGN KEY ([changed_by]) REFERENCES [user_accounts]([user_id])
    );
    
    -- Add index for querying history
    CREATE INDEX IX_match_lifecycle_history_match 
    ON match_lifecycle_history(match_id, changed_at DESC);
    
    PRINT 'match_lifecycle_history table created successfully';
END
ELSE
BEGIN
    PRINT 'match_lifecycle_history table already exists, skipping creation';
END
GO

-- ============================================================
-- PART 6: UPDATE MATCH_REPORTS TABLE (if exists)
-- ============================================================

PRINT 'Checking match_reports table...';
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'match_reports')
BEGIN
    PRINT 'match_reports table exists, adding lifecycle integration columns...';
    
    -- Add flag to distinguish from supervisor reports
    IF NOT EXISTS (
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID(N'[dbo].[match_reports]') 
      AND name = 'report_type'
    )
    BEGIN
        ALTER TABLE [dbo].[match_reports]
        ADD [report_type] VARCHAR(20) DEFAULT 'referee' 
        CHECK (report_type IN ('referee', 'technical'));
    END
    
    PRINT 'match_reports table updated';
END
ELSE
BEGIN
    PRINT 'match_reports table does not exist, skipping...';
END
GO

-- ============================================================
-- DATA INITIALIZATION
-- ============================================================

PRINT 'Initializing data...';
GO

-- Set default status for existing matches without status
UPDATE matches 
SET status = 'SCHEDULED' 
WHERE status IS NULL OR status = '';
GO

-- Initialize report flags for existing matches
UPDATE matches 
SET 
  referee_report_submitted = 0,
  supervisor_report_submitted = 0
WHERE referee_report_submitted IS NULL;
GO

PRINT 'Migration completed successfully!';
GO

-- ============================================================
-- VERIFICATION QUERIES (Uncomment to run)
-- ============================================================

/*
-- Verify matches columns
SELECT TOP 1 * FROM matches;

-- Verify match_lineups columns
SELECT TOP 1 * FROM match_lineups;

-- Verify match_official_assignments
SELECT TOP 1 * FROM match_official_assignments;

-- Verify new tables
SELECT COUNT(*) as supervisor_reports_count FROM supervisor_reports;
SELECT COUNT(*) as lifecycle_history_count FROM match_lifecycle_history;

-- Check status values
SELECT DISTINCT status, COUNT(*) as count 
FROM matches 
GROUP BY status 
ORDER BY status;
*/
