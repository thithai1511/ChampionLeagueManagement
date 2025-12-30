/*
    Baseline Roles & Permissions Seed
    -----------------------------------------------
    Use this script after the schema migration has been applied to a clean database.

    How to run (SQL Server):
      1. CONNECT to the target database (e.g. USE LeagueManagement;).
      2. Set the admin username you want to elevate:
           DECLARE @AdminUsername NVARCHAR(150) = N'admin';
      3. EXEC the rest of this script (it is idempotent; re-running is safe).

*/

SET NOCOUNT ON;

IF DB_NAME() IS NULL
BEGIN
    THROW 50000, 'Please run USE <database> before executing the seed script.', 1;
END;

PRINT '>> Seeding baseline permissions...';
MERGE permissions AS target
USING (VALUES
    ('manage_users',      N'Manage users',      N'Create, update, assign roles, and delete user accounts.'),
    ('manage_rulesets',   N'Manage rulesets',   N'Create, edit, publish, and assign tournament rulesets.'),
    ('view_audit_logs',   N'View audit logs',   N'Read-only access to audit_events.'),
    ('manage_content',    N'Manage content',    N'Create and curate news, media, and CMS content.'),
    ('manage_matches',    N'Manage matches',    N'Schedule matches, update live data, and finalize results.'),
    ('manage_teams',      N'Manage teams',      N'Approve rosters, register teams, maintain squads.'),
    ('manage_own_player_registrations', N'Manage own player registrations', N'Create, edit, and view player registrations for the teams assigned to the user.'),
    ('view_own_team',     N'View own team',     N'Read-only access to the teams/squad assigned to the user.'),
    ('approve_player_registrations', N'Approve player registrations', N'Review and approve/reject player registrations across all teams.'),
    ('manage_own_team_squad', N'Manage own team squad', N'Edit approved players within the user’s assigned teams.')
) AS source (code, name, description)
ON target.code = source.code
WHEN NOT MATCHED THEN
    INSERT (code, name, description)
    VALUES (source.code, source.name, source.description);

PRINT '>> Seeding baseline roles...';
MERGE roles AS target
USING (VALUES
    ('super_admin',    N'Super Administrator', N'Full system control', 1),
    ('admin',          N'Administrator',       N'Operational admin without system lock features', 0),
    ('supervisor',     N'Match Supervisor',    N'Match supervision and evaluation responsibilities', 0),
    ('match_official', N'Match Official',      N'Live match operations team', 0),
    ('team_admin',     N'Team Administrator',  N'Manage player registrations for assigned teams', 0),
    ('viewer',         N'Read-only Viewer',    N'Analyst/reporting account', 0)
) AS source (code, name, description, is_system_role)
ON target.code = source.code
WHEN NOT MATCHED THEN
    INSERT (code, name, description, is_system_role)
    VALUES (source.code, source.name, source.description, source.is_system_role);

PRINT '>> Mapping permissions to roles...';
DECLARE @RolePermission TABLE (role_code VARCHAR(100), permission_code VARCHAR(150));
INSERT INTO @RolePermission (role_code, permission_code)
VALUES
    ('super_admin', 'manage_users'),
    ('super_admin', 'manage_rulesets'),
    ('super_admin', 'view_audit_logs'),
    ('super_admin', 'manage_content'),
    ('super_admin', 'manage_matches'),
    ('super_admin', 'manage_teams'),
    ('super_admin', 'approve_player_registrations'),
    ('super_admin', 'manage_own_player_registrations'),
    ('super_admin', 'view_own_team'),
    ('super_admin', 'manage_own_team_squad'),
    ('admin', 'manage_rulesets'),
    ('admin', 'manage_matches'),
    ('admin', 'manage_teams'),
    ('admin', 'approve_player_registrations'),
    ('supervisor', 'manage_matches'),
    ('supervisor', 'manage_discipline'),
    ('match_official', 'manage_matches'),
    ('team_admin', 'manage_own_player_registrations'),
    ('team_admin', 'view_own_team'),
    ('team_admin', 'manage_own_team_squad');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM @RolePermission rp
JOIN roles r ON r.code = rp.role_code
JOIN permissions p ON p.code = rp.permission_code
WHERE NOT EXISTS (
    SELECT 1
    FROM role_permissions existing
    WHERE existing.role_id = r.role_id
      AND existing.permission_id = p.permission_id
);

PRINT '>> Assigning super_admin role to the designated account...';
DECLARE @AdminUsername NVARCHAR(150);
IF OBJECT_ID('tempdb..#seed_params') IS NOT NULL
    DROP TABLE #seed_params;

CREATE TABLE #seed_params (admin_username NVARCHAR(150));

INSERT INTO #seed_params (admin_username)
VALUES (COALESCE(@AdminUsername, N'admin'));

DECLARE @TargetUsername NVARCHAR(150) = (SELECT TOP 1 admin_username FROM #seed_params);
DECLARE @TargetUserId INT = (
    SELECT user_id FROM user_accounts WHERE username = @TargetUsername
);

IF @TargetUserId IS NULL
BEGIN
    RAISERROR('User "%s" not found in user_accounts. Insert the account first or change @AdminUsername.', 16, 1, @TargetUsername);
END
ELSE
BEGIN
    DECLARE @SuperAdminRoleId INT = (SELECT role_id FROM roles WHERE code = 'super_admin');
    IF NOT EXISTS (
        SELECT 1 FROM user_role_assignments
        WHERE user_id = @TargetUserId AND role_id = @SuperAdminRoleId
    )
    BEGIN
        INSERT INTO user_role_assignments (user_id, role_id, assigned_at, assigned_by)
        VALUES (@TargetUserId, @SuperAdminRoleId, SYSUTCDATETIME(), @TargetUserId);
        PRINT CONCAT('   -> Assigned super_admin to ', @TargetUsername);
    END
    ELSE
    BEGIN
        PRINT CONCAT('   -> ', @TargetUsername, ' already has super_admin role. Skipping.');
    END;
END;

DROP TABLE #seed_params;
PRINT '>> Baseline seed completed successfully.';
