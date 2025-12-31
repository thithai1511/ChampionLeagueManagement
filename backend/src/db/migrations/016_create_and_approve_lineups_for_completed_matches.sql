/*
  Migration: Tạo và duyệt lineup cho các trận đã có kết quả nhưng chưa có lineup
  Mục đích: Chuẩn hóa dữ liệu - các trận đã có kết quả phải có lineup và đã được duyệt
  
  Logic:
  - Tìm các trận đã có kết quả (home_score, away_score không null) nhưng chưa có lineup
  - Từ match_events, lấy danh sách cầu thủ đã thi đấu
  - Xác định cầu thủ starting vs substitute dựa vào player_match_stats.is_starting hoặc logic khác
  - Tạo lineup với approval_status = 'APPROVED'
*/

SET NOCOUNT ON;

PRINT '=== BẮT ĐẦU TẠO VÀ DUYỆT LINEUP CHO CÁC TRẬN ĐÃ CÓ KẾT QUẢ ===';
PRINT 'Thời gian: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '';

-- Bước 1: Lấy admin user đầu tiên để làm approved_by và submitted_by
DECLARE @adminUserId INT;
SELECT TOP 1 @adminUserId = ua.user_id 
FROM user_accounts ua
INNER JOIN user_role_assignments ura ON ua.user_id = ura.user_id
INNER JOIN roles r ON ura.role_id = r.role_id
WHERE LOWER(r.code) LIKE '%admin%' OR LOWER(r.name) LIKE '%admin%'
ORDER BY ua.user_id ASC;

IF @adminUserId IS NULL
BEGIN
    -- Nếu không có admin, lấy user đầu tiên có quyền manage_matches
    SELECT TOP 1 @adminUserId = ua.user_id
    FROM user_accounts ua
    INNER JOIN user_role_assignments ura ON ua.user_id = ura.user_id
    INNER JOIN roles r ON ura.role_id = r.role_id
    INNER JOIN role_permissions rp ON r.role_id = rp.role_id
    INNER JOIN permissions p ON rp.permission_id = p.permission_id
    WHERE LOWER(p.code) LIKE '%match%' OR LOWER(p.name) LIKE '%match%'
    ORDER BY ua.user_id ASC;
END

IF @adminUserId IS NULL
BEGIN
    -- Fallback: Lấy user đầu tiên
    SELECT TOP 1 @adminUserId = user_id 
    FROM user_accounts 
    ORDER BY user_id ASC;
END

IF @adminUserId IS NULL
BEGIN
    PRINT '❌ LỖI: Không tìm thấy user nào để set approved_by!';
    RAISERROR('Không thể tiếp tục vì không có user để set approved_by', 16, 1);
    RETURN;
END

PRINT '✅ Sử dụng User ID: ' + CAST(@adminUserId AS VARCHAR(10)) + ' làm approved_by và submitted_by';
PRINT '';

-- Bước 2: Tìm các trận đã có kết quả nhưng chưa có lineup
PRINT '🔍 Đang tìm các trận đã có kết quả nhưng chưa có lineup...';

DECLARE @matchesNeedingLineup TABLE (
    match_id INT,
    season_id INT,
    home_season_team_id INT,
    away_season_team_id INT,
    home_score TINYINT,
    away_score TINYINT,
    status VARCHAR(50)
);

INSERT INTO @matchesNeedingLineup (match_id, season_id, home_season_team_id, away_season_team_id, home_score, away_score, status)
SELECT 
    m.match_id,
    m.season_id,
    m.home_season_team_id,
    m.away_season_team_id,
    m.home_score,
    m.away_score,
    m.status
FROM matches m
WHERE m.home_score IS NOT NULL 
  AND m.away_score IS NOT NULL
  AND NOT EXISTS (
      -- Chưa có lineup cho home team
      SELECT 1 FROM match_lineups ml 
      WHERE ml.match_id = m.match_id 
        AND ml.season_team_id = m.home_season_team_id
        AND ml.team_type IN ('home', 'away')
  )
  AND NOT EXISTS (
      -- Chưa có lineup cho away team
      SELECT 1 FROM match_lineups ml 
      WHERE ml.match_id = m.match_id 
        AND ml.season_team_id = m.away_season_team_id
        AND ml.team_type IN ('home', 'away')
  );

DECLARE @totalMatches INT;
SELECT @totalMatches = COUNT(*) FROM @matchesNeedingLineup;
PRINT '   Tìm thấy ' + CAST(@totalMatches AS VARCHAR(10)) + ' trận cần tạo lineup';
PRINT '';

IF @totalMatches = 0
BEGIN
    PRINT '✅ Không có trận nào cần tạo lineup. Dữ liệu đã chuẩn!';
    RETURN;
END

-- Bước 3: Hiển thị thống kê
PRINT '📊 THỐNG KÊ TRƯỚC KHI TẠO LINEUP:';
PRINT '';

SELECT 
    mnl.season_id,
    s.name AS season_name,
    COUNT(DISTINCT mnl.match_id) AS so_tran_can_tao_lineup
FROM @matchesNeedingLineup mnl
LEFT JOIN seasons s ON mnl.season_id = s.season_id
GROUP BY mnl.season_id, s.name
ORDER BY mnl.season_id;

PRINT '';

-- Bước 4: Tạo lineup từ match_events và player_match_stats
PRINT '⚠️  SẴN SÀNG TẠO LINEUP:';
PRINT '   - Số trận sẽ được tạo lineup: ' + CAST(@totalMatches AS VARCHAR(10));
PRINT '   - Approved by User ID: ' + CAST(@adminUserId AS VARCHAR(10));
PRINT '';

    -- Thực hiện tạo lineup bằng bulk insert
    BEGIN TRANSACTION;

    BEGIN TRY
        DECLARE @lineupCount INT = 0;
        DECLARE @matchCount INT = 0;

        -- Tạo lineup cho home teams từ player_match_stats (ưu tiên)
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
        FROM @matchesNeedingLineup mnl
        INNER JOIN player_match_stats pms ON mnl.match_id = pms.match_id
        INNER JOIN season_player_registrations spr ON pms.season_player_id = spr.season_player_id
        WHERE spr.season_team_id = mnl.home_season_team_id
          AND spr.season_id = mnl.season_id
          AND NOT EXISTS (
              SELECT 1 FROM match_lineups ml 
              WHERE ml.match_id = mnl.match_id 
                AND ml.player_id = spr.player_id
                AND ml.season_team_id = mnl.home_season_team_id
          );

        SET @lineupCount = @lineupCount + @@ROWCOUNT;

        -- Tạo lineup cho home teams từ match_events (fallback nếu không có player_match_stats)
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
            1, -- Mặc định là starting nếu có event
            0,
            'approved',
            'home',
            'APPROVED',
            @adminUserId,
            GETDATE(),
            ISNULL(spr.shirt_number, spr.jersey_number),
            ISNULL(spr.position_code, spr.position)
        FROM @matchesNeedingLineup mnl
        INNER JOIN match_events me ON mnl.match_id = me.match_id
        INNER JOIN season_player_registrations spr ON me.season_player_id = spr.season_player_id
        WHERE me.season_team_id = mnl.home_season_team_id
          AND spr.season_id = mnl.season_id
          AND me.season_player_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM match_lineups ml 
              WHERE ml.match_id = mnl.match_id 
                AND ml.player_id = spr.player_id
                AND ml.season_team_id = mnl.home_season_team_id
          )
          AND NOT EXISTS (
              -- Chỉ insert nếu chưa có trong player_match_stats
              SELECT 1 FROM player_match_stats pms2
              WHERE pms2.match_id = mnl.match_id
                AND pms2.season_player_id = me.season_player_id
          );

        SET @lineupCount = @lineupCount + @@ROWCOUNT;

        -- Tạo lineup cho away teams từ player_match_stats (ưu tiên)
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
        FROM @matchesNeedingLineup mnl
        INNER JOIN player_match_stats pms ON mnl.match_id = pms.match_id
        INNER JOIN season_player_registrations spr ON pms.season_player_id = spr.season_player_id
        WHERE spr.season_team_id = mnl.away_season_team_id
          AND spr.season_id = mnl.season_id
          AND NOT EXISTS (
              SELECT 1 FROM match_lineups ml 
              WHERE ml.match_id = mnl.match_id 
                AND ml.player_id = spr.player_id
                AND ml.season_team_id = mnl.away_season_team_id
          );

        SET @lineupCount = @lineupCount + @@ROWCOUNT;

        -- Tạo lineup cho away teams từ match_events (fallback nếu không có player_match_stats)
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
            1, -- Mặc định là starting nếu có event
            0,
            'approved',
            'away',
            'APPROVED',
            @adminUserId,
            GETDATE(),
            ISNULL(spr.shirt_number, spr.jersey_number),
            ISNULL(spr.position_code, spr.position)
        FROM @matchesNeedingLineup mnl
        INNER JOIN match_events me ON mnl.match_id = me.match_id
        INNER JOIN season_player_registrations spr ON me.season_player_id = spr.season_player_id
        WHERE me.season_team_id = mnl.away_season_team_id
          AND spr.season_id = mnl.season_id
          AND me.season_player_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM match_lineups ml 
              WHERE ml.match_id = mnl.match_id 
                AND ml.player_id = spr.player_id
                AND ml.season_team_id = mnl.away_season_team_id
          )
          AND NOT EXISTS (
              -- Chỉ insert nếu chưa có trong player_match_stats
              SELECT 1 FROM player_match_stats pms2
              WHERE pms2.match_id = mnl.match_id
                AND pms2.season_player_id = me.season_player_id
          );

        SET @lineupCount = @lineupCount + @@ROWCOUNT;
        SELECT @matchCount = COUNT(DISTINCT match_id) FROM @matchesNeedingLineup;

    COMMIT TRANSACTION;

    PRINT '';
    PRINT '✅ TẠO LINEUP THÀNH CÔNG!';
    PRINT '   - Đã xử lý ' + CAST(@matchCount AS VARCHAR(10)) + ' trận đấu';
    PRINT '   - Đã tạo ' + CAST(@lineupCount AS VARCHAR(10)) + ' lineup records (cầu thủ)';
    PRINT '   - Tất cả lineup đã được set approval_status = APPROVED';
    PRINT '   - Thời gian hoàn thành: ' + CONVERT(VARCHAR, GETDATE(), 120);
    PRINT '';

    -- Hiển thị thống kê sau khi tạo
    PRINT '📊 THỐNG KÊ SAU KHI TẠO LINEUP:';
    PRINT '';

    SELECT 
        mnl.season_id,
        s.name AS season_name,
        COUNT(DISTINCT mnl.match_id) AS so_tran_da_tao_lineup,
        COUNT(DISTINCT ml.lineup_id) AS so_lineup_records
    FROM @matchesNeedingLineup mnl
    LEFT JOIN match_lineups ml ON mnl.match_id = ml.match_id
    LEFT JOIN seasons s ON mnl.season_id = s.season_id
    GROUP BY mnl.season_id, s.name
    ORDER BY mnl.season_id;

    PRINT '';
    PRINT '✅ HOÀN TẤT TẠO VÀ DUYỆT LINEUP!';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    
    DECLARE @errorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @errorLine INT = ERROR_LINE();
    
    PRINT '';
    PRINT '❌ LỖI KHI TẠO LINEUP:';
    PRINT '   - Lỗi: ' + @errorMessage;
    PRINT '   - Dòng: ' + CAST(@errorLine AS VARCHAR(10));
    PRINT '   - Đã rollback tất cả thay đổi';
    
    RAISERROR(@errorMessage, 16, 1);
END CATCH;

GO

