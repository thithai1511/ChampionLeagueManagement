/*
  Add contact and stadium info columns to teams table
  ----------------------------------------------------
  Adds phone, email, stadium_name, stadium_capacity to support
  club profile management by team admins.
*/

SET NOCOUNT ON;

IF DB_NAME() IS NULL
BEGIN
  THROW 50000, 'Please run USE <database> before executing this migration.', 1;
END;

PRINT '>> Adding contact and stadium columns to teams table...';

-- Add phone column
IF COL_LENGTH('teams', 'phone') IS NULL
BEGIN
  ALTER TABLE teams
    ADD phone VARCHAR(32) NULL;
  PRINT '  - Added phone column';
END;

-- Add email column
IF COL_LENGTH('teams', 'email') IS NULL
BEGIN
  ALTER TABLE teams
    ADD email VARCHAR(255) NULL;
  PRINT '  - Added email column';
END;

-- Add stadium_name column
IF COL_LENGTH('teams', 'stadium_name') IS NULL
BEGIN
  ALTER TABLE teams
    ADD stadium_name NVARCHAR(255) NULL;
  PRINT '  - Added stadium_name column';
END;

-- Add stadium_capacity column
IF COL_LENGTH('teams', 'stadium_capacity') IS NULL
BEGIN
  ALTER TABLE teams
    ADD stadium_capacity INT NULL CHECK (stadium_capacity >= 0);
  PRINT '  - Added stadium_capacity column';
END;

PRINT '>> Migration completed successfully!';
GO







