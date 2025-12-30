/*
  Migration: Tự động duyệt đội hình cho các trận đã kết thúc
  Mục đích: Chuẩn hóa dữ liệu cho các mùa cũ (đã nạp dữ liệu)
  
  Logic:
  - Tìm tất cả các trận đã kết thúc (status IN ('FINISHED', 'COMPLETED', 'finished', 'completed'))
  - Tự động approve tất cả lineup của các trận đó nếu chưa được approve
  - Sử dụng admin user đầu tiên làm approved_by
*/

SET NOCOUNT ON;

PRINT '=== BẮT ĐẦU CHUẨN HÓA DỮ LIỆU ĐỘI HÌNH CHO CÁC TRẬN ĐÃ KẾT THÚC ===';
PRINT 'Thời gian: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '';

-- Bước 1: Lấy admin user đầu tiên để làm approved_by
DECLARE @adminUserId INT;
SELECT TOP 1 @adminUserId = user_id 
FROM user_accounts 
WHERE role = 'admin' 
ORDER BY user_id ASC;

IF @adminUserId IS NULL
BEGIN
    -- Nếu không có admin, lấy user đầu tiên có quyền manage_matches
    SELECT TOP 1 @adminUserId = ua.user_id
    FROM user_accounts ua
    INNER JOIN user_roles ur ON ua.user_id = ur.user_id
    INNER JOIN roles r ON ur.role_id = r.role_id
    INNER JOIN role_permissions rp ON r.role_id = rp.role_id
    INNER JOIN permissions p ON rp.permission_id = p.permission_id
    WHERE p.permission_name = 'manage_matches'
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

PRINT '✅ Sử dụng User ID: ' + CAST(@adminUserId AS VARCHAR(10)) + ' làm approved_by';
PRINT '';

-- Bước 2: Tìm các trận đã kết thúc
PRINT '🔍 Đang tìm các trận đã kết thúc...';

DECLARE @finishedMatches TABLE (
    match_id INT,
    status VARCHAR(50),
    season_id INT
);

INSERT INTO @finishedMatches (match_id, status, season_id)
SELECT match_id, status, season_id
FROM matches
WHERE UPPER(LTRIM(RTRIM(status))) IN ('FINISHED', 'COMPLETED', 'FINISHED', 'COMPLETED')
   OR LOWER(LTRIM(RTRIM(status))) IN ('finished', 'completed');

DECLARE @totalFinishedMatches INT;
SELECT @totalFinishedMatches = COUNT(*) FROM @finishedMatches;
PRINT '   Tìm thấy ' + CAST(@totalFinishedMatches AS VARCHAR(10)) + ' trận đã kết thúc';
PRINT '';

-- Bước 3: Tìm các lineup chưa được approve của các trận đã kết thúc
PRINT '🔍 Đang tìm các lineup chưa được approve...';

DECLARE @lineupsToApprove TABLE (
    lineup_id INT,
    match_id INT,
    team_type VARCHAR(10),
    current_status VARCHAR(20)
);

INSERT INTO @lineupsToApprove (lineup_id, match_id, team_type, current_status)
SELECT 
    ml.lineup_id,
    ml.match_id,
    ml.team_type,
    ml.approval_status
FROM match_lineups ml
INNER JOIN @finishedMatches fm ON ml.match_id = fm.match_id
WHERE ml.team_type IN ('home', 'away')
  AND (
    ml.approval_status IS NULL 
    OR UPPER(LTRIM(RTRIM(ml.approval_status))) NOT IN ('APPROVED', 'APPROVED')
    OR ml.approval_status = 'PENDING'
    OR ml.approval_status = 'SUBMITTED'
  );

DECLARE @totalLineupsToApprove INT;
SELECT @totalLineupsToApprove = COUNT(*) FROM @lineupsToApprove;
PRINT '   Tìm thấy ' + CAST(@totalLineupsToApprove AS VARCHAR(10)) + ' lineup cần approve';
PRINT '';

IF @totalLineupsToApprove = 0
BEGIN
    PRINT '✅ Không có lineup nào cần approve. Dữ liệu đã chuẩn!';
    RETURN;
END

-- Bước 4: Hiển thị thống kê trước khi update
PRINT '📊 THỐNG KÊ TRƯỚC KHI CẬP NHẬT:';
PRINT '';

SELECT 
    fm.season_id,
    s.name AS season_name,
    COUNT(DISTINCT fm.match_id) AS so_tran_da_ket_thuc,
    COUNT(lta.lineup_id) AS so_lineup_can_approve
FROM @finishedMatches fm
LEFT JOIN @lineupsToApprove lta ON fm.match_id = lta.match_id
LEFT JOIN seasons s ON fm.season_id = s.season_id
GROUP BY fm.season_id, s.name
ORDER BY fm.season_id;

PRINT '';

-- Bước 5: Xác nhận và thực hiện update
PRINT '⚠️  SẴN SÀNG CẬP NHẬT:';
PRINT '   - Số lineup sẽ được approve: ' + CAST(@totalLineupsToApprove AS VARCHAR(10));
PRINT '   - Approved by User ID: ' + CAST(@adminUserId AS VARCHAR(10));
PRINT '';

-- Thực hiện update
BEGIN TRANSACTION;

BEGIN TRY
    -- Update approval_status
    UPDATE ml
    SET 
        ml.approval_status = 'APPROVED',
        ml.approved_by = @adminUserId,
        ml.approved_at = GETDATE()
    FROM match_lineups ml
    INNER JOIN @lineupsToApprove lta ON ml.lineup_id = lta.lineup_id;

    DECLARE @updatedCount INT;
    SET @updatedCount = @@ROWCOUNT;

    -- Kiểm tra và cập nhật match status nếu cả 2 lineup đã được approve
    -- (Chỉ cho các trận chưa ở trạng thái READY hoặc cao hơn)
    UPDATE m
    SET 
        m.status = 'READY',
        m.lineups_approved_at = GETDATE(),
        m.updated_at = SYSUTCDATETIME()
    FROM matches m
    INNER JOIN @finishedMatches fm ON m.match_id = fm.match_id
    WHERE m.status NOT IN ('READY', 'IN_PROGRESS', 'FINISHED', 'COMPLETED', 'REPORTED')
      AND NOT EXISTS (
          SELECT 1 
          FROM match_lineups ml2 
          WHERE ml2.match_id = m.match_id 
            AND ml2.team_type IN ('home', 'away')
            AND (ml2.approval_status IS NULL OR UPPER(LTRIM(RTRIM(ml2.approval_status))) != 'APPROVED')
      );

    COMMIT TRANSACTION;

    PRINT '✅ CẬP NHẬT THÀNH CÔNG!';
    PRINT '   - Đã approve ' + CAST(@updatedCount AS VARCHAR(10)) + ' lineup';
    PRINT '   - Thời gian hoàn thành: ' + CONVERT(VARCHAR, GETDATE(), 120);
    PRINT '';

    -- Hiển thị thống kê sau khi update
    PRINT '📊 THỐNG KÊ SAU KHI CẬP NHẬT:';
    PRINT '';

    SELECT 
        fm.season_id,
        s.name AS season_name,
        COUNT(DISTINCT fm.match_id) AS so_tran_da_ket_thuc,
        COUNT(DISTINCT CASE WHEN ml.approval_status = 'APPROVED' THEN ml.match_id END) AS so_tran_da_approve_lineup
    FROM @finishedMatches fm
    LEFT JOIN match_lineups ml ON fm.match_id = ml.match_id AND ml.team_type IN ('home', 'away')
    LEFT JOIN seasons s ON fm.season_id = s.season_id
    GROUP BY fm.season_id, s.name
    ORDER BY fm.season_id;

    PRINT '';
    PRINT '✅ HOÀN TẤT CHUẨN HÓA DỮ LIỆU!';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    
    DECLARE @errorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @errorLine INT = ERROR_LINE();
    
    PRINT '❌ LỖI KHI CẬP NHẬT:';
    PRINT '   - Lỗi: ' + @errorMessage;
    PRINT '   - Dòng: ' + CAST(@errorLine AS VARCHAR(10));
    PRINT '   - Đã rollback tất cả thay đổi';
    
    RAISERROR(@errorMessage, 16, 1);
END CATCH;

