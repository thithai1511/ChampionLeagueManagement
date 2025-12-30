/*
  Migration: Sửa các trận đã có approval_status = APPROVED nhưng thiếu lineup records
  Mục đích: Tạo lineup cho các trận đã được approve nhưng chưa có lineup thực sự
  
  Logic:
  - Tìm các trận đã có kết quả (home_score, away_score không null)
  - Kiểm tra xem có lineup records không (đếm số lượng)
  - Nếu không có hoặc thiếu, tạo lineup từ match_events và player_match_stats
*/

SET NOCOUNT ON;

PRINT '=== SỬA CÁC TRẬN ĐÃ DUYỆT NHƯNG THIẾU LINEUP ===';
PRINT 'Thời gian: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '';

-- Bước 1: Lấy admin user
DECLARE @adminUserId INT;
SELECT TOP 1 @adminUserId = ua.user_id 
FROM user_accounts ua
INNER JOIN user_role_assignments ura ON ua.user_id = ura.user_id
INNER JOIN roles r ON ura.role_id = r.role_id
WHERE LOWER(r.code) LIKE '%admin%' OR LOWER(r.name) LIKE '%admin%'
ORDER BY ua.user_id ASC;

IF @adminUserId IS NULL
BEGIN
    SELECT TOP 1 @adminUserId = user_id FROM user_accounts ORDER BY user_id ASC;
END

IF @adminUserId IS NULL
BEGIN
    PRINT '❌ LỖI: Không tìm thấy user!';
    RETURN;
END

PRINT '✅ Sử dụng User ID: ' + CAST(@adminUserId AS VARCHAR(10));
PRINT '';

-- Bước 2: Tìm các trận đã có kết quả nhưng thiếu lineup
PRINT '🔍 Đang tìm các trận thiếu lineup...';

DECLARE @matchesMissingLineup TABLE (
    match_id INT,
    season_id INT,
    home_season_team_id INT,
    away_season_team_id INT,
    home_lineup_count INT,
    away_lineup_count INT
);

INSERT INTO @matchesMissingLineup (match_id, season_id, home_season_team_id, away_season_team_id, home_lineup_count, away_lineup_count)
SELECT 
    m.match_id,
    m.season_id,
    m.home_season_team_id,
    m.away_season_team_id,
    ISNULL(home_count.cnt, 0) AS home_lineup_count,
    ISNULL(away_count.cnt, 0) AS away_lineup_count
FROM matches m
LEFT JOIN (
    SELECT match_id, season_team_id, COUNT(*) as cnt
    FROM match_lineups
    WHERE team_type = 'home'
    GROUP BY match_id, season_team_id
) home_count ON m.match_id = home_count.match_id AND m.home_season_team_id = home_count.season_team_id
LEFT JOIN (
    SELECT match_id, season_team_id, COUNT(*) as cnt
    FROM match_lineups
    WHERE team_type = 'away'
    GROUP BY match_id, season_team_id
) away_count ON m.match_id = away_count.match_id AND m.away_season_team_id = away_count.season_team_id
WHERE m.home_score IS NOT NULL 
  AND m.away_score IS NOT NULL
  AND (ISNULL(home_count.cnt, 0) = 0 OR ISNULL(away_count.cnt, 0) = 0);

DECLARE @totalMatches INT;
SELECT @totalMatches = COUNT(*) FROM @matchesMissingLineup;
PRINT '   Tìm thấy ' + CAST(@totalMatches AS VARCHAR(10)) + ' trận thiếu lineup';
PRINT '';

IF @totalMatches = 0
BEGIN
    PRINT '✅ Không có trận nào thiếu lineup!';
    RETURN;
END

-- Hiển thị thống kê
PRINT '📊 THỐNG KÊ:';
SELECT 
    season_id,
    COUNT(*) AS so_tran_thieu_lineup,
    SUM(CASE WHEN home_lineup_count = 0 THEN 1 ELSE 0 END) AS thieu_home,
    SUM(CASE WHEN away_lineup_count = 0 THEN 1 ELSE 0 END) AS thieu_away
FROM @matchesMissingLineup
GROUP BY season_id;
PRINT '';

-- Bước 3: Tạo lineup
BEGIN TRANSACTION;

BEGIN TRY
    DECLARE @lineupCount INT = 0;
    DECLARE @rowCount INT;

    -- Tạo lineup cho home teams từ player_match_stats
    INSERT INTO match_lineups (
        match_id, season_id, season_team_id, player_id,
        submitted_by, submitted_at,
        is_starting, is_captain, status,
        team_type, approval_status, approved_by, approved_at,
        jersey_number, position
    )
    SELECT DISTINCT
        mnl.match_id,
        mnl.season_id,
        mnl.home_season_team_id,
        spr.player_id,
        @adminUserId,
        GETDATE(),
        ISNULL(pms.is_starting, 1),
        0,
        'approved',
        'home',
        'APPROVED',
        @adminUserId,
        GETDATE(),
        ISNULL(spr.shirt_number, spr.jersey_number),
        ISNULL(spr.position_code, spr.position)
    FROM @matchesMissingLineup mnl
    INNER JOIN player_match_stats pms ON mnl.match_id = pms.match_id
    INNER JOIN season_player_registrations spr ON pms.season_player_id = spr.season_player_id
    WHERE spr.season_team_id = mnl.home_season_team_id
      AND spr.season_id = mnl.season_id
      AND mnl.home_lineup_count = 0
      AND NOT EXISTS (
          SELECT 1 FROM match_lineups ml 
          WHERE ml.match_id = mnl.match_id 
            AND ml.player_id = spr.player_id
            AND ml.season_team_id = mnl.home_season_team_id
      );

    SET @rowCount = @@ROWCOUNT;
    SET @lineupCount = @lineupCount + @rowCount;

    -- Tạo lineup cho home teams từ match_events (fallback)
    INSERT INTO match_lineups (
        match_id, season_id, season_team_id, player_id,
        submitted_by, submitted_at,
        is_starting, is_captain, status,
        team_type, approval_status, approved_by, approved_at,
        jersey_number, position
    )
    SELECT DISTINCT
        mnl.match_id,
        mnl.season_id,
        mnl.home_season_team_id,
        spr.player_id,
        @adminUserId,
        GETDATE(),
        1,
        0,
        'approved',
        'home',
        'APPROVED',
        @adminUserId,
        GETDATE(),
        ISNULL(spr.shirt_number, spr.jersey_number),
        ISNULL(spr.position_code, spr.position)
    FROM @matchesMissingLineup mnl
    INNER JOIN match_events me ON mnl.match_id = me.match_id
    INNER JOIN season_player_registrations spr ON me.season_player_id = spr.season_player_id
    WHERE me.season_team_id = mnl.home_season_team_id
      AND spr.season_id = mnl.season_id
      AND me.season_player_id IS NOT NULL
      AND mnl.home_lineup_count = 0
      AND NOT EXISTS (
          SELECT 1 FROM match_lineups ml 
          WHERE ml.match_id = mnl.match_id 
            AND ml.player_id = spr.player_id
            AND ml.season_team_id = mnl.home_season_team_id
      )
      AND NOT EXISTS (
          SELECT 1 FROM player_match_stats pms2
          WHERE pms2.match_id = mnl.match_id
            AND pms2.season_player_id = me.season_player_id
      );

    SET @rowCount = @@ROWCOUNT;
    SET @lineupCount = @lineupCount + @rowCount;

    -- Tạo lineup cho away teams từ player_match_stats
    INSERT INTO match_lineups (
        match_id, season_id, season_team_id, player_id,
        submitted_by, submitted_at,
        is_starting, is_captain, status,
        team_type, approval_status, approved_by, approved_at,
        jersey_number, position
    )
    SELECT DISTINCT
        mnl.match_id,
        mnl.season_id,
        mnl.away_season_team_id,
        spr.player_id,
        @adminUserId,
        GETDATE(),
        ISNULL(pms.is_starting, 1),
        0,
        'approved',
        'away',
        'APPROVED',
        @adminUserId,
        GETDATE(),
        ISNULL(spr.shirt_number, spr.jersey_number),
        ISNULL(spr.position_code, spr.position)
    FROM @matchesMissingLineup mnl
    INNER JOIN player_match_stats pms ON mnl.match_id = pms.match_id
    INNER JOIN season_player_registrations spr ON pms.season_player_id = spr.season_player_id
    WHERE spr.season_team_id = mnl.away_season_team_id
      AND spr.season_id = mnl.season_id
      AND mnl.away_lineup_count = 0
      AND NOT EXISTS (
          SELECT 1 FROM match_lineups ml 
          WHERE ml.match_id = mnl.match_id 
            AND ml.player_id = spr.player_id
            AND ml.season_team_id = mnl.away_season_team_id
      );

    SET @rowCount = @@ROWCOUNT;
    SET @lineupCount = @lineupCount + @rowCount;

    -- Tạo lineup cho away teams từ match_events (fallback)
    INSERT INTO match_lineups (
        match_id, season_id, season_team_id, player_id,
        submitted_by, submitted_at,
        is_starting, is_captain, status,
        team_type, approval_status, approved_by, approved_at,
        jersey_number, position
    )
    SELECT DISTINCT
        mnl.match_id,
        mnl.season_id,
        mnl.away_season_team_id,
        spr.player_id,
        @adminUserId,
        GETDATE(),
        1,
        0,
        'approved',
        'away',
        'APPROVED',
        @adminUserId,
        GETDATE(),
        ISNULL(spr.shirt_number, spr.jersey_number),
        ISNULL(spr.position_code, spr.position)
    FROM @matchesMissingLineup mnl
    INNER JOIN match_events me ON mnl.match_id = me.match_id
    INNER JOIN season_player_registrations spr ON me.season_player_id = spr.season_player_id
    WHERE me.season_team_id = mnl.away_season_team_id
      AND spr.season_id = mnl.season_id
      AND me.season_player_id IS NOT NULL
      AND mnl.away_lineup_count = 0
      AND NOT EXISTS (
          SELECT 1 FROM match_lineups ml 
          WHERE ml.match_id = mnl.match_id 
            AND ml.player_id = spr.player_id
            AND ml.season_team_id = mnl.away_season_team_id
      )
      AND NOT EXISTS (
          SELECT 1 FROM player_match_stats pms2
          WHERE pms2.match_id = mnl.match_id
            AND pms2.season_player_id = me.season_player_id
      );

    SET @rowCount = @@ROWCOUNT;
    SET @lineupCount = @lineupCount + @rowCount;

    COMMIT TRANSACTION;

    PRINT '';
    PRINT '✅ HOÀN TẤT!';
    PRINT '   - Đã tạo ' + CAST(@lineupCount AS VARCHAR(10)) + ' lineup records';
    PRINT '';

    -- Thống kê sau khi tạo
    PRINT '📊 THỐNG KÊ SAU KHI TẠO:';
    SELECT 
        mnl.season_id,
        COUNT(DISTINCT mnl.match_id) AS so_tran_da_xu_ly,
        COUNT(DISTINCT ml.lineup_id) AS so_lineup_records
    FROM @matchesMissingLineup mnl
    LEFT JOIN match_lineups ml ON mnl.match_id = ml.match_id
    GROUP BY mnl.season_id;

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    DECLARE @errorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    PRINT '❌ LỖI: ' + @errorMessage;
    RAISERROR(@errorMessage, 16, 1);
END CATCH;

GO

