/*
  Migration: Bổ sung đầy đủ lineup cho các trận đã được approve nhưng thiếu cầu thủ
  Mục đích: Đảm bảo tất cả cầu thủ có trong match_events hoặc player_match_stats đều có trong lineup
  
  Logic:
  - Tìm các trận đã có approval_status = 'APPROVED' 
  - So sánh số lượng cầu thủ trong lineup vs số lượng trong match_events/player_match_stats
  - Bổ sung các cầu thủ còn thiếu vào lineup
*/

SET NOCOUNT ON;

PRINT '=== BỔ SUNG ĐẦY ĐỦ LINEUP CHO CÁC TRẬN ĐÃ DUYỆT ===';
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

-- Bước 2: Tìm các trận đã approve nhưng thiếu cầu thủ
PRINT '🔍 Đang tìm các trận đã approve nhưng thiếu cầu thủ...';

DECLARE @matchesToComplete TABLE (
    match_id INT,
    season_id INT,
    home_season_team_id INT,
    away_season_team_id INT,
    home_lineup_count INT,
    away_lineup_count INT,
    home_players_available INT,
    away_players_available INT
);

INSERT INTO @matchesToComplete (match_id, season_id, home_season_team_id, away_season_team_id, home_lineup_count, away_lineup_count, home_players_available, away_players_available)
SELECT 
    m.match_id,
    m.season_id,
    m.home_season_team_id,
    m.away_season_team_id,
    ISNULL(home_lineup.cnt, 0) AS home_lineup_count,
    ISNULL(away_lineup.cnt, 0) AS away_lineup_count,
    ISNULL(home_players.cnt, 0) AS home_players_available,
    ISNULL(away_players.cnt, 0) AS away_players_available
FROM matches m
-- Đếm lineup hiện tại
LEFT JOIN (
    SELECT match_id, season_team_id, COUNT(*) as cnt
    FROM match_lineups
    WHERE team_type = 'home'
    GROUP BY match_id, season_team_id
) home_lineup ON m.match_id = home_lineup.match_id AND m.home_season_team_id = home_lineup.season_team_id
LEFT JOIN (
    SELECT match_id, season_team_id, COUNT(*) as cnt
    FROM match_lineups
    WHERE team_type = 'away'
    GROUP BY match_id, season_team_id
) away_lineup ON m.match_id = away_lineup.match_id AND m.away_season_team_id = away_lineup.season_team_id
-- Đếm cầu thủ có sẵn từ player_match_stats hoặc match_events
LEFT JOIN (
    SELECT 
        match_id,
        season_team_id,
        COUNT(DISTINCT season_player_id) as cnt
    FROM (
        SELECT DISTINCT pms.match_id, spr.season_team_id, pms.season_player_id
        FROM player_match_stats pms
        INNER JOIN season_player_registrations spr ON pms.season_player_id = spr.season_player_id
        WHERE pms.season_player_id IS NOT NULL
        UNION
        SELECT DISTINCT me.match_id, me.season_team_id, me.season_player_id
        FROM match_events me
        WHERE me.season_player_id IS NOT NULL
    ) combined
    GROUP BY match_id, season_team_id
) home_players ON m.match_id = home_players.match_id AND m.home_season_team_id = home_players.season_team_id
LEFT JOIN (
    SELECT 
        match_id,
        season_team_id,
        COUNT(DISTINCT season_player_id) as cnt
    FROM (
        SELECT DISTINCT pms.match_id, spr.season_team_id, pms.season_player_id
        FROM player_match_stats pms
        INNER JOIN season_player_registrations spr ON pms.season_player_id = spr.season_player_id
        WHERE pms.season_player_id IS NOT NULL
        UNION
        SELECT DISTINCT me.match_id, me.season_team_id, me.season_player_id
        FROM match_events me
        WHERE me.season_player_id IS NOT NULL
    ) combined
    GROUP BY match_id, season_team_id
) away_players ON m.match_id = away_players.match_id AND m.away_season_team_id = away_players.season_team_id
WHERE m.home_score IS NOT NULL 
  AND m.away_score IS NOT NULL
  AND (
      -- Có approval_status = 'APPROVED' trong lineup
      EXISTS (
          SELECT 1 FROM match_lineups ml
          WHERE ml.match_id = m.match_id
            AND ml.approval_status = 'APPROVED'
      )
      OR
      -- Hoặc trận đã completed/finished
      m.status IN ('COMPLETED', 'completed', 'FINISHED', 'finished')
  )
  AND (
      -- Thiếu cầu thủ trong lineup so với số có sẵn
      (ISNULL(home_lineup.cnt, 0) < ISNULL(home_players.cnt, 0))
      OR
      (ISNULL(away_lineup.cnt, 0) < ISNULL(away_players.cnt, 0))
  );

DECLARE @totalMatches INT;
SELECT @totalMatches = COUNT(*) FROM @matchesToComplete;
PRINT '   Tìm thấy ' + CAST(@totalMatches AS VARCHAR(10)) + ' trận cần bổ sung lineup';
PRINT '';

IF @totalMatches = 0
BEGIN
    PRINT '✅ Không có trận nào cần bổ sung!';
    RETURN;
END

-- Hiển thị thống kê (trước transaction để tránh ảnh hưởng đến @@ROWCOUNT)
PRINT '📊 THỐNG KÊ:';
DECLARE @statsTable TABLE (
    season_id INT,
    so_tran_can_bo_sung INT,
    thieu_home INT,
    thieu_away INT,
    so_cau_thu_thieu_home INT,
    so_cau_thu_thieu_away INT
);

INSERT INTO @statsTable
SELECT 
    season_id,
    COUNT(*) AS so_tran_can_bo_sung,
    SUM(CASE WHEN home_lineup_count < home_players_available THEN 1 ELSE 0 END) AS thieu_home,
    SUM(CASE WHEN away_lineup_count < away_players_available THEN 1 ELSE 0 END) AS thieu_away,
    SUM(home_players_available - home_lineup_count) AS so_cau_thu_thieu_home,
    SUM(away_players_available - away_lineup_count) AS so_cau_thu_thieu_away
FROM @matchesToComplete
GROUP BY season_id;

SELECT * FROM @statsTable;
PRINT '';

-- Bước 3: Bổ sung lineup
BEGIN TRANSACTION;

BEGIN TRY
    DECLARE @lineupCount INT = 0;
    DECLARE @rowCount INT;

    -- Bổ sung lineup cho home teams từ player_match_stats (ưu tiên)
    INSERT INTO match_lineups (
        match_id, season_id, season_team_id, player_id,
        submitted_by, submitted_at,
        is_starting, is_captain, status,
        team_type, approval_status, approved_by, approved_at,
        jersey_number, position
    )
    SELECT DISTINCT
        mtc.match_id,
        mtc.season_id,
        mtc.home_season_team_id,
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
    FROM @matchesToComplete mtc
    INNER JOIN player_match_stats pms ON mtc.match_id = pms.match_id
    INNER JOIN season_player_registrations spr ON pms.season_player_id = spr.season_player_id
    WHERE spr.season_team_id = mtc.home_season_team_id
      AND spr.season_id = mtc.season_id
      AND mtc.home_lineup_count < mtc.home_players_available
      AND NOT EXISTS (
          SELECT 1 FROM match_lineups ml 
          WHERE ml.match_id = mtc.match_id 
            AND ml.player_id = spr.player_id
            AND ml.season_team_id = mtc.home_season_team_id
      );

    SET @rowCount = @@ROWCOUNT;
    SET @lineupCount = @lineupCount + @rowCount;

    -- Bổ sung lineup cho home teams từ match_events (fallback)
    INSERT INTO match_lineups (
        match_id, season_id, season_team_id, player_id,
        submitted_by, submitted_at,
        is_starting, is_captain, status,
        team_type, approval_status, approved_by, approved_at,
        jersey_number, position
    )
    SELECT DISTINCT
        mtc.match_id,
        mtc.season_id,
        mtc.home_season_team_id,
        spr.player_id,
        @adminUserId,
        GETDATE(),
        1, -- Mặc định là starting
        0,
        'approved',
        'home',
        'APPROVED',
        @adminUserId,
        GETDATE(),
        ISNULL(spr.shirt_number, spr.jersey_number),
        ISNULL(spr.position_code, spr.position)
    FROM @matchesToComplete mtc
    INNER JOIN match_events me ON mtc.match_id = me.match_id
    INNER JOIN season_player_registrations spr ON me.season_player_id = spr.season_player_id
    WHERE me.season_team_id = mtc.home_season_team_id
      AND spr.season_id = mtc.season_id
      AND me.season_player_id IS NOT NULL
      AND mtc.home_lineup_count < mtc.home_players_available
      AND NOT EXISTS (
          SELECT 1 FROM match_lineups ml 
          WHERE ml.match_id = mtc.match_id 
            AND ml.player_id = spr.player_id
            AND ml.season_team_id = mtc.home_season_team_id
      )
      AND NOT EXISTS (
          SELECT 1 FROM player_match_stats pms2
          WHERE pms2.match_id = mtc.match_id
            AND pms2.season_player_id = me.season_player_id
      );

    SET @rowCount = @@ROWCOUNT;
    SET @lineupCount = @lineupCount + @rowCount;

    -- Bổ sung lineup cho away teams từ player_match_stats (ưu tiên)
    INSERT INTO match_lineups (
        match_id, season_id, season_team_id, player_id,
        submitted_by, submitted_at,
        is_starting, is_captain, status,
        team_type, approval_status, approved_by, approved_at,
        jersey_number, position
    )
    SELECT DISTINCT
        mtc.match_id,
        mtc.season_id,
        mtc.away_season_team_id,
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
    FROM @matchesToComplete mtc
    INNER JOIN player_match_stats pms ON mtc.match_id = pms.match_id
    INNER JOIN season_player_registrations spr ON pms.season_player_id = spr.season_player_id
    WHERE spr.season_team_id = mtc.away_season_team_id
      AND spr.season_id = mtc.season_id
      AND mtc.away_lineup_count < mtc.away_players_available
      AND NOT EXISTS (
          SELECT 1 FROM match_lineups ml 
          WHERE ml.match_id = mtc.match_id 
            AND ml.player_id = spr.player_id
            AND ml.season_team_id = mtc.away_season_team_id
      );

    SET @rowCount = @@ROWCOUNT;
    SET @lineupCount = @lineupCount + @rowCount;

    -- Bổ sung lineup cho away teams từ match_events (fallback)
    INSERT INTO match_lineups (
        match_id, season_id, season_team_id, player_id,
        submitted_by, submitted_at,
        is_starting, is_captain, status,
        team_type, approval_status, approved_by, approved_at,
        jersey_number, position
    )
    SELECT DISTINCT
        mtc.match_id,
        mtc.season_id,
        mtc.away_season_team_id,
        spr.player_id,
        @adminUserId,
        GETDATE(),
        1, -- Mặc định là starting
        0,
        'approved',
        'away',
        'APPROVED',
        @adminUserId,
        GETDATE(),
        ISNULL(spr.shirt_number, spr.jersey_number),
        ISNULL(spr.position_code, spr.position)
    FROM @matchesToComplete mtc
    INNER JOIN match_events me ON mtc.match_id = me.match_id
    INNER JOIN season_player_registrations spr ON me.season_player_id = spr.season_player_id
    WHERE me.season_team_id = mtc.away_season_team_id
      AND spr.season_id = mtc.season_id
      AND me.season_player_id IS NOT NULL
      AND mtc.away_lineup_count < mtc.away_players_available
      AND NOT EXISTS (
          SELECT 1 FROM match_lineups ml 
          WHERE ml.match_id = mtc.match_id 
            AND ml.player_id = spr.player_id
            AND ml.season_team_id = mtc.away_season_team_id
      )
      AND NOT EXISTS (
          SELECT 1 FROM player_match_stats pms2
          WHERE pms2.match_id = mtc.match_id
            AND pms2.season_player_id = me.season_player_id
      );

    SET @rowCount = @@ROWCOUNT;
    SET @lineupCount = @lineupCount + @rowCount;

    COMMIT TRANSACTION;

    PRINT '';
    PRINT '✅ HOÀN TẤT!';
    PRINT '   - Đã bổ sung ' + CAST(@lineupCount AS VARCHAR(10)) + ' lineup records';
    PRINT '';

    -- Thống kê sau khi bổ sung
    PRINT '📊 THỐNG KÊ SAU KHI BỔ SUNG:';
    SELECT 
        mtc.season_id,
        COUNT(DISTINCT mtc.match_id) AS so_tran_da_xu_ly,
        COUNT(DISTINCT ml.lineup_id) AS tong_lineup_records
    FROM @matchesToComplete mtc
    LEFT JOIN match_lineups ml ON mtc.match_id = ml.match_id
    GROUP BY mtc.season_id;

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    DECLARE @errorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    PRINT '❌ LỖI: ' + @errorMessage;
    RAISERROR(@errorMessage, 16, 1);
END CATCH;

GO

