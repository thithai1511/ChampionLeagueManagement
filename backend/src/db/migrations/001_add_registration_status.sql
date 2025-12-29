-- Add status columns to season_player_registrations
-- Chỉ chạy nếu bảng đã tồn tại (sau khi chạy full_system_schema.sql)

-- Kiểm tra bảng có tồn tại không
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'season_player_registrations')
BEGIN
    PRINT 'WARNING: Table season_player_registrations does not exist yet.';
    PRINT 'Please run 20250205_full_system_schema.sql first from backend/src/data/migrations/';
    PRINT 'Skipping migration 001...';
END
ELSE
BEGIN
    -- Add status column if not exists
    IF NOT EXISTS (
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID(N'[dbo].[season_player_registrations]') 
      AND name = 'status'
    )
    BEGIN
        ALTER TABLE [dbo].[season_player_registrations]
        ADD [status] NVARCHAR(20) NOT NULL DEFAULT 'PENDING';
        PRINT 'Added status column';
    END
    ELSE
    BEGIN
        PRINT 'status column already exists';
    END

    -- Add approved_at column if not exists
    IF NOT EXISTS (
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID(N'[dbo].[season_player_registrations]') 
      AND name = 'approved_at'
    )
    BEGIN
        ALTER TABLE [dbo].[season_player_registrations]
        ADD [approved_at] DATETIME NULL;
        PRINT 'Added approved_at column';
    END
    ELSE
    BEGIN
        PRINT 'approved_at column already exists';
    END

    -- Add reject_reason column if not exists
    IF NOT EXISTS (
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID(N'[dbo].[season_player_registrations]') 
      AND name = 'reject_reason'
    )
    BEGIN
        ALTER TABLE [dbo].[season_player_registrations]
        ADD [reject_reason] NVARCHAR(255) NULL;
        PRINT 'Added reject_reason column';
    END
    ELSE
    BEGIN
        PRINT 'reject_reason column already exists';
    END

    PRINT 'Migration 001: Completed successfully';
END
GO
