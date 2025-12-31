/*
  Migration: 013 - Create player_of_match table
  Purpose: Create dedicated table for storing Man of the Match selections
  Date: 2025-12-29
  
  This table is used to track Player of the Match (MOTM) selections for each match.
  It supports multiple selection methods: referee, team captain, fan vote, or statistics-based.
*/

SET NOCOUNT ON;
PRINT '=== Starting Migration 013: Create player_of_match table ===';

-- ============================================================
-- CREATE player_of_match TABLE
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'player_of_match')
BEGIN
    CREATE TABLE player_of_match (
        pom_id INT IDENTITY(1,1) PRIMARY KEY,
        match_id INT NOT NULL,
        player_id INT NOT NULL,
        team_id INT NOT NULL,
        selected_by_method VARCHAR(20) NOT NULL 
            CHECK (selected_by_method IN ('referee', 'team_captain', 'fan_vote', 'statistics')),
        votes_count INT NULL,
        rating DECIMAL(3,1) NULL CHECK (rating >= 0 AND rating <= 10),
        selected_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        
        CONSTRAINT FK_player_of_match_match FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE,
        CONSTRAINT FK_player_of_match_player FOREIGN KEY (player_id) REFERENCES players(player_id),
        CONSTRAINT FK_player_of_match_team FOREIGN KEY (team_id) REFERENCES teams(team_id),
        CONSTRAINT UQ_player_of_match_per_match UNIQUE (match_id) -- Only one MOTM per match
    );

    CREATE INDEX IX_player_of_match_player ON player_of_match(player_id);
    CREATE INDEX IX_player_of_match_team ON player_of_match(team_id);
    CREATE INDEX IX_player_of_match_match ON player_of_match(match_id);

    PRINT 'Created player_of_match table';
END
ELSE
BEGIN
    PRINT 'Table player_of_match already exists, skipping creation';
END
GO

-- ============================================================
-- CREATE fan_votes TABLE (for fan voting feature)
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'player_of_match_votes')
BEGIN
    CREATE TABLE player_of_match_votes (
        vote_id INT IDENTITY(1,1) PRIMARY KEY,
        match_id INT NOT NULL,
        player_id INT NOT NULL,
        voter_user_id INT NULL, -- NULL for anonymous votes
        voter_ip_hash VARCHAR(64) NULL, -- For preventing duplicate anonymous votes
        voted_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        
        CONSTRAINT FK_pom_votes_match FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE,
        CONSTRAINT FK_pom_votes_player FOREIGN KEY (player_id) REFERENCES players(player_id),
        CONSTRAINT FK_pom_votes_user FOREIGN KEY (voter_user_id) REFERENCES user_accounts(user_id)
    );

    CREATE INDEX IX_pom_votes_match_player ON player_of_match_votes(match_id, player_id);

    PRINT 'Created player_of_match_votes table';
END
ELSE
BEGIN
    PRINT 'Table player_of_match_votes already exists, skipping creation';
END
GO

-- ============================================================
-- ADD manage_player_of_match permission
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'manage_player_of_match')
BEGIN
    INSERT INTO permissions (code, name, description)
    VALUES ('manage_player_of_match', N'Manage Player of Match', N'Select and manage Player of the Match awards');
    PRINT 'Added manage_player_of_match permission';
END

-- Grant to super_admin and match_official roles
DECLARE @superAdminRoleId INT, @matchOfficialRoleId INT, @permissionId INT;

SELECT @superAdminRoleId = role_id FROM roles WHERE code = 'super_admin';
SELECT @matchOfficialRoleId = role_id FROM roles WHERE code = 'match_official';
SELECT @permissionId = permission_id FROM permissions WHERE code = 'manage_player_of_match';

IF @superAdminRoleId IS NOT NULL AND @permissionId IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = @superAdminRoleId AND permission_id = @permissionId)
    BEGIN
        INSERT INTO role_permissions (role_id, permission_id) VALUES (@superAdminRoleId, @permissionId);
        PRINT 'Granted manage_player_of_match to super_admin';
    END
END

IF @matchOfficialRoleId IS NOT NULL AND @permissionId IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = @matchOfficialRoleId AND permission_id = @permissionId)
    BEGIN
        INSERT INTO role_permissions (role_id, permission_id) VALUES (@matchOfficialRoleId, @permissionId);
        PRINT 'Granted manage_player_of_match to match_official';
    END
END
GO

PRINT '=== Migration 013 completed successfully ===';
GO



