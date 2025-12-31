-- Migration 020: Create official records for users with match_official role
-- This script creates official records for users who have the match_official role
-- but don't have a corresponding record in the officials table

PRINT 'Creating official records for users with match_official role...';
GO

-- Check if officials table exists
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'officials')
BEGIN
    PRINT 'ERROR: officials table does not exist!';
    PRINT 'Please run the main schema migration first.';
    RETURN;
END
GO

-- Create official records for users with match_official role who don't have one
INSERT INTO officials (user_id, full_name, role_specialty, status, created_at)
SELECT 
    u.user_id,
    -- Combine first_name and last_name, fallback to username if both are empty
    CASE 
        WHEN LTRIM(RTRIM(ISNULL(u.first_name, '') + ' ' + ISNULL(u.last_name, ''))) <> ''
        THEN LTRIM(RTRIM(ISNULL(u.first_name, '') + ' ' + ISNULL(u.last_name, '')))
        ELSE u.username
    END AS full_name,
    'referee' AS role_specialty,  -- Default to referee, can be changed later
    'active' AS status,
    SYSUTCDATETIME() AS created_at
FROM user_accounts u
INNER JOIN user_role_assignments ura ON u.user_id = ura.user_id
INNER JOIN roles r ON ura.role_id = r.role_id
WHERE 
    -- User has match_official role (check role name or code)
    (LOWER(r.name) LIKE '%official%' OR LOWER(r.name) LIKE '%trọng tài%' OR LOWER(r.code) = 'match_official')
    -- User doesn't already have an official record
    AND NOT EXISTS (
        SELECT 1 FROM officials o WHERE o.user_id = u.user_id
    )
    -- User is active
    AND u.status = 'active'
GO

-- Print summary
DECLARE @count INT;
SELECT @count = COUNT(*) 
FROM officials o
INNER JOIN user_role_assignments ura ON o.user_id = ura.user_id
INNER JOIN roles r ON ura.role_id = r.role_id
WHERE (LOWER(r.name) LIKE '%official%' OR LOWER(r.name) LIKE '%trọng tài%' OR LOWER(r.code) = 'match_official');

PRINT CONCAT('Total official records for match_official users: ', @count);
GO

PRINT 'Migration 020 completed successfully!';
PRINT 'Note: You may need to update role_specialty for each official (referee, assistant, etc.)';
GO

