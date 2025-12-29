-- ============================================================
-- MIGRATION: Add Missing Tables & Columns for State Machine
-- Tạo bảng nếu chưa có, thêm cột nếu thiếu
-- ============================================================

-- !!! QUAN TRỌNG: Kết nối trực tiếp đến database LeagueManagement !!!
-- Azure SQL không hỗ trợ USE statement
-- Khi connect trong SSMS: Options >> Connection Properties >> Connect to database: LeagueManagement

PRINT '=== Starting State Machine Migration ===';
PRINT '';

-- ============================================================
-- PART 0: Check required base tables exist
-- ============================================================

PRINT '--- PART 0: Checking base tables ---';

-- List existing tables
SELECT name as 'Existing Tables' FROM sys.tables ORDER BY name;

-- ============================================================
-- PART 1: Create season_team_registrations if not exists
-- ============================================================

PRINT '--- PART 1: season_team_registrations ---';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'season_team_registrations')
BEGIN
    CREATE TABLE season_team_registrations (
        registration_id INT IDENTITY(1,1) PRIMARY KEY,
        season_id INT NOT NULL,
        team_id INT NOT NULL,
        invitation_id INT NULL,
        fee_status VARCHAR(32) NOT NULL DEFAULT 'unpaid',
        registration_status VARCHAR(32) NOT NULL DEFAULT 'draft',
        submitted_at DATETIME2 NULL,
        reviewed_at DATETIME2 NULL,
        reviewed_by INT NULL,
        review_notes NVARCHAR(1000) NULL,
        governing_body NVARCHAR(255) NULL,
        city NVARCHAR(150) NULL,
        home_stadium_name NVARCHAR(255) NULL,
        home_stadium_capacity INT NULL,
        home_stadium_rating TINYINT NULL,
        kit_description NVARCHAR(255) NULL,
        squad_size TINYINT NULL,
        foreign_player_count TINYINT NULL,
        dossier_url NVARCHAR(500) NULL,
        notes NVARCHAR(1000) NULL,
        -- State machine columns
        submission_data NVARCHAR(MAX) NULL,
        reviewer_note NVARCHAR(1000) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NULL,
        CONSTRAINT CK_season_team_reg_status CHECK (
            registration_status IN (
                'draft','submitted','under_review','approved','rejected','needs_resubmission',
                'DRAFT_INVITE','INVITED','ACCEPTED','DECLINED','SUBMITTED','REQUEST_CHANGE','APPROVED','REJECTED'
            )
        )
    );
    PRINT 'Created: season_team_registrations';
END
ELSE
BEGIN
    PRINT 'Exists: season_team_registrations - Adding missing columns...';
    
    -- submission_data
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('season_team_registrations') AND name = 'submission_data')
    BEGIN
        ALTER TABLE season_team_registrations ADD submission_data NVARCHAR(MAX) NULL;
        PRINT '  Added: submission_data';
    END
    
    -- reviewer_note
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('season_team_registrations') AND name = 'reviewer_note')
    BEGIN
        ALTER TABLE season_team_registrations ADD reviewer_note NVARCHAR(1000) NULL;
        PRINT '  Added: reviewer_note';
    END
    
    -- created_at
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('season_team_registrations') AND name = 'created_at')
    BEGIN
        ALTER TABLE season_team_registrations ADD created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
        PRINT '  Added: created_at';
    END
    
    -- updated_at
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('season_team_registrations') AND name = 'updated_at')
    BEGIN
        ALTER TABLE season_team_registrations ADD updated_at DATETIME2 NULL;
        PRINT '  Added: updated_at';
    END
    
    -- Update status constraint
    IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_season_team_reg_status')
    BEGIN
        ALTER TABLE season_team_registrations DROP CONSTRAINT CK_season_team_reg_status;
    END
    
    ALTER TABLE season_team_registrations ADD CONSTRAINT CK_season_team_reg_status CHECK (
        registration_status IN (
            'draft','submitted','under_review','approved','rejected','needs_resubmission',
            'DRAFT_INVITE','INVITED','ACCEPTED','DECLINED','SUBMITTED','REQUEST_CHANGE','APPROVED','REJECTED'
        )
    );
    PRINT '  Updated: CK_season_team_reg_status constraint';
END
GO

-- ============================================================
-- PART 2: season_registration_status_history
-- ============================================================

PRINT '--- PART 2: season_registration_status_history ---';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'season_registration_status_history')
BEGIN
    CREATE TABLE season_registration_status_history (
        id INT IDENTITY(1,1) PRIMARY KEY,
        registration_id INT NOT NULL,
        from_status VARCHAR(32) NULL,
        to_status VARCHAR(32) NOT NULL,
        changed_by INT NULL,
        note NVARCHAR(1000) NULL,
        changed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_season_reg_history_registration ON season_registration_status_history(registration_id, changed_at DESC);
    PRINT 'Created: season_registration_status_history';
END
ELSE PRINT 'Exists: season_registration_status_history';
GO

-- ============================================================
-- PART 3: matches - Add lifecycle columns
-- ============================================================

PRINT '--- PART 3: matches table ---';

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'matches')
BEGIN
    -- home_lineup_status
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('matches') AND name = 'home_lineup_status')
    BEGIN
        ALTER TABLE matches ADD home_lineup_status VARCHAR(20) NULL DEFAULT 'PENDING';
        PRINT '  Added: home_lineup_status';
    END
    
    -- away_lineup_status
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('matches') AND name = 'away_lineup_status')
    BEGIN
        ALTER TABLE matches ADD away_lineup_status VARCHAR(20) NULL DEFAULT 'PENDING';
        PRINT '  Added: away_lineup_status';
    END
    
    -- main_referee_id
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('matches') AND name = 'main_referee_id')
    BEGIN
        ALTER TABLE matches ADD main_referee_id INT NULL;
        PRINT '  Added: main_referee_id';
    END
    
    -- assistant_referee_1_id
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('matches') AND name = 'assistant_referee_1_id')
    BEGIN
        ALTER TABLE matches ADD assistant_referee_1_id INT NULL;
        PRINT '  Added: assistant_referee_1_id';
    END
    
    -- assistant_referee_2_id
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('matches') AND name = 'assistant_referee_2_id')
    BEGIN
        ALTER TABLE matches ADD assistant_referee_2_id INT NULL;
        PRINT '  Added: assistant_referee_2_id';
    END
    
    -- fourth_official_id
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('matches') AND name = 'fourth_official_id')
    BEGIN
        ALTER TABLE matches ADD fourth_official_id INT NULL;
        PRINT '  Added: fourth_official_id';
    END
    
    -- supervisor_id
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('matches') AND name = 'supervisor_id')
    BEGIN
        ALTER TABLE matches ADD supervisor_id INT NULL;
        PRINT '  Added: supervisor_id';
    END
    
    -- referee_report_submitted
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('matches') AND name = 'referee_report_submitted')
    BEGIN
        ALTER TABLE matches ADD referee_report_submitted BIT DEFAULT 0;
        PRINT '  Added: referee_report_submitted';
    END
    
    -- supervisor_report_submitted
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('matches') AND name = 'supervisor_report_submitted')
    BEGIN
        ALTER TABLE matches ADD supervisor_report_submitted BIT DEFAULT 0;
        PRINT '  Added: supervisor_report_submitted';
    END
    
    -- officials_assigned_at
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('matches') AND name = 'officials_assigned_at')
    BEGIN
        ALTER TABLE matches ADD officials_assigned_at DATETIME2 NULL;
        PRINT '  Added: officials_assigned_at';
    END
    
    PRINT 'Updated: matches table';
END
ELSE PRINT 'WARNING: matches table does not exist!';
GO

-- ============================================================
-- PART 4: match_lifecycle_history
-- ============================================================

PRINT '--- PART 4: match_lifecycle_history ---';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'match_lifecycle_history')
BEGIN
    CREATE TABLE match_lifecycle_history (
        id INT IDENTITY(1,1) PRIMARY KEY,
        match_id INT NOT NULL,
        from_status VARCHAR(20) NULL,
        to_status VARCHAR(20) NOT NULL,
        changed_by INT NULL,
        change_note NVARCHAR(500) NULL,
        changed_at DATETIME2 DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_match_lifecycle_history_match ON match_lifecycle_history(match_id, changed_at DESC);
    PRINT 'Created: match_lifecycle_history';
END
ELSE PRINT 'Exists: match_lifecycle_history';
GO

-- ============================================================
-- PART 5: supervisor_reports
-- ============================================================

PRINT '--- PART 5: supervisor_reports ---';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'supervisor_reports')
BEGIN
    CREATE TABLE supervisor_reports (
        id INT IDENTITY(1,1) PRIMARY KEY,
        match_id INT NOT NULL,
        supervisor_id INT NOT NULL,
        organization_rating INT NULL CHECK (organization_rating BETWEEN 1 AND 10),
        home_team_rating INT NULL CHECK (home_team_rating BETWEEN 1 AND 10),
        away_team_rating INT NULL CHECK (away_team_rating BETWEEN 1 AND 10),
        stadium_condition_rating INT NULL CHECK (stadium_condition_rating BETWEEN 1 AND 10),
        security_rating INT NULL CHECK (security_rating BETWEEN 1 AND 10),
        incident_report NVARCHAR(MAX) NULL,
        has_serious_violation BIT DEFAULT 0,
        send_to_disciplinary BIT DEFAULT 0,
        recommendations NVARCHAR(MAX) NULL,
        reviewed_by INT NULL,
        reviewed_at DATETIME2 NULL,
        review_notes NVARCHAR(1000) NULL,
        submitted_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_supervisor_report_match UNIQUE (match_id)
    );
    CREATE INDEX IX_supervisor_reports_supervisor ON supervisor_reports(supervisor_id);
    PRINT 'Created: supervisor_reports';
END
ELSE PRINT 'Exists: supervisor_reports';
GO

-- ============================================================
-- PART 6: match_lineups - Add missing columns
-- ============================================================

PRINT '--- PART 6: match_lineups ---';

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'match_lineups')
BEGIN
    -- player_id
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_lineups') AND name = 'player_id')
    BEGIN
        ALTER TABLE match_lineups ADD player_id INT NULL;
        PRINT '  Added: player_id';
    END
    
    -- team_type
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_lineups') AND name = 'team_type')
    BEGIN
        ALTER TABLE match_lineups ADD team_type VARCHAR(10) NULL;
        PRINT '  Added: team_type';
    END
    
    -- approval_status
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_lineups') AND name = 'approval_status')
    BEGIN
        ALTER TABLE match_lineups ADD approval_status VARCHAR(20) DEFAULT 'PENDING';
        PRINT '  Added: approval_status';
    END
    
    -- approved_by
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_lineups') AND name = 'approved_by')
    BEGIN
        ALTER TABLE match_lineups ADD approved_by INT NULL;
        PRINT '  Added: approved_by';
    END
    
    -- approved_at
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_lineups') AND name = 'approved_at')
    BEGIN
        ALTER TABLE match_lineups ADD approved_at DATETIME2 NULL;
        PRINT '  Added: approved_at';
    END
    
    -- rejection_reason
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_lineups') AND name = 'rejection_reason')
    BEGIN
        ALTER TABLE match_lineups ADD rejection_reason NVARCHAR(500) NULL;
        PRINT '  Added: rejection_reason';
    END
    
    -- is_starting
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_lineups') AND name = 'is_starting')
    BEGIN
        ALTER TABLE match_lineups ADD is_starting BIT DEFAULT 1;
        PRINT '  Added: is_starting';
    END
    
    -- is_captain
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_lineups') AND name = 'is_captain')
    BEGIN
        ALTER TABLE match_lineups ADD is_captain BIT DEFAULT 0;
        PRINT '  Added: is_captain';
    END
    
    -- jersey_number
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_lineups') AND name = 'jersey_number')
    BEGIN
        ALTER TABLE match_lineups ADD jersey_number TINYINT NULL;
        PRINT '  Added: jersey_number';
    END
    
    -- position
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_lineups') AND name = 'position')
    BEGIN
        ALTER TABLE match_lineups ADD position VARCHAR(32) NULL;
        PRINT '  Added: position';
    END
    
    -- minutes_played
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_lineups') AND name = 'minutes_played')
    BEGIN
        ALTER TABLE match_lineups ADD minutes_played SMALLINT NULL;
        PRINT '  Added: minutes_played';
    END
    
    -- updated_at
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('match_lineups') AND name = 'updated_at')
    BEGIN
        ALTER TABLE match_lineups ADD updated_at DATETIME2 NULL;
        PRINT '  Added: updated_at';
    END
    
    PRINT 'Updated: match_lineups table';
END
ELSE PRINT 'WARNING: match_lineups table does not exist!';
GO

-- ============================================================
-- PART 7: disciplinary_records
-- ============================================================

PRINT '--- PART 7: disciplinary_records ---';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'disciplinary_records')
BEGIN
    CREATE TABLE disciplinary_records (
        record_id INT IDENTITY(1,1) PRIMARY KEY,
        season_id INT NOT NULL,
        player_id INT NOT NULL,
        match_id INT NULL,
        offense_type VARCHAR(50) NOT NULL,
        offense_date DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        yellow_card_count INT NOT NULL DEFAULT 0,
        red_card_count INT NOT NULL DEFAULT 0,
        is_suspended BIT NOT NULL DEFAULT 0,
        suspension_matches INT NULL DEFAULT 0,
        suspension_start_date DATETIME2 NULL,
        suspension_end_date DATETIME2 NULL,
        notes NVARCHAR(500) NULL,
        created_by INT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_disciplinary_player_season ON disciplinary_records(player_id, season_id, is_suspended);
    PRINT 'Created: disciplinary_records';
END
ELSE PRINT 'Exists: disciplinary_records';
GO

-- ============================================================
-- PART 8: notifications
-- ============================================================

PRINT '--- PART 8: notifications ---';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'notifications')
BEGIN
    CREATE TABLE notifications (
        notification_id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        title NVARCHAR(255) NOT NULL,
        message NVARCHAR(MAX) NULL,
        related_entity VARCHAR(50) NULL,
        related_id INT NULL,
        action_url NVARCHAR(500) NULL,
        is_read BIT NOT NULL DEFAULT 0,
        read_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_notifications_user ON notifications(user_id, is_read, created_at DESC);
    PRINT 'Created: notifications';
END
ELSE PRINT 'Exists: notifications';
GO

-- ============================================================
-- PART 9: user_accounts - full_name column
-- ============================================================

PRINT '--- PART 9: user_accounts ---';

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'user_accounts')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('user_accounts') AND name = 'full_name')
    BEGIN
        ALTER TABLE user_accounts ADD full_name NVARCHAR(200) NULL;
        PRINT '  Added: full_name';
    END
    ELSE PRINT 'Exists: full_name';
END
ELSE PRINT 'WARNING: user_accounts table does not exist!';
GO

-- ============================================================
-- PART 10: Initialize default values
-- ============================================================

PRINT '--- PART 10: Initializing defaults ---';

-- Set default lineup status for matches
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'matches')
BEGIN
    UPDATE matches SET home_lineup_status = 'PENDING' WHERE home_lineup_status IS NULL;
    UPDATE matches SET away_lineup_status = 'PENDING' WHERE away_lineup_status IS NULL;
    UPDATE matches SET referee_report_submitted = 0 WHERE referee_report_submitted IS NULL;
    UPDATE matches SET supervisor_report_submitted = 0 WHERE supervisor_report_submitted IS NULL;
    PRINT 'Initialized matches defaults';
END

-- Set updated_at for registrations
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'season_team_registrations')
BEGIN
    UPDATE season_team_registrations SET updated_at = GETDATE() WHERE updated_at IS NULL;
    PRINT 'Initialized season_team_registrations.updated_at';
END
GO

PRINT '';
PRINT '=== Migration Completed! ===';
PRINT '';

-- ============================================================
-- VERIFICATION: Show all tables
-- ============================================================

PRINT '--- Verification: All tables ---';
SELECT name as 'All Tables' FROM sys.tables ORDER BY name;
GO
