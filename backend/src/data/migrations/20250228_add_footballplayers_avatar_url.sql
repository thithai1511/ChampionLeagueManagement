/*
  Add avatar_url to FootballPlayers table
  This migration adds the avatar_url column to the FootballPlayers table
  to store player avatar URLs fetched from TheSportsDB.
*/

SET NOCOUNT ON;

PRINT '>> Ensuring FootballPlayers.avatar_url column exists...';
IF NOT EXISTS (
  SELECT 1
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'FootballPlayers' AND COLUMN_NAME = 'avatar_url'
)
BEGIN
  ALTER TABLE dbo.FootballPlayers
    ADD avatar_url NVARCHAR(1024) NULL;

  PRINT '✅ Added avatar_url column to FootballPlayers table.';
END
ELSE
BEGIN
  PRINT 'ℹ️ FootballPlayers.avatar_url column already exists. Skipping.';
END;
GO


