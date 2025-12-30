# Migration 015: Tự động duyệt đội hình cho các trận đã kết thúc

## Mục đích

Chuẩn hóa dữ liệu cho các mùa cũ (đã nạp dữ liệu). Script này sẽ:
- Tìm tất cả các trận đã kết thúc (status = 'FINISHED' hoặc 'COMPLETED')
- Tự động approve tất cả lineup của các trận đó nếu chưa được approve
- Sử dụng admin user đầu tiên làm `approved_by`

## Vấn đề cần giải quyết

Có các trận đấu đã kết thúc (có kết quả) nhưng trạng thái lineup vẫn là chưa duyệt. Điều này không hợp lý vì:
- Nếu trận đã đá xong thì phải đã duyệt đội hình rồi
- Các mùa cũ là dữ liệu đã nạp, cần chuẩn hóa trạng thái

## Cách chạy

### Option 1: Chạy qua TypeScript script (Khuyến nghị)

```bash
cd ChampionLeagueManagement/backend
npx ts-node scripts/auto_approve_finished_lineups.ts
```

### Option 2: Chạy trực tiếp SQL file

**SQL Server Management Studio (SSMS):**
1. Mở SSMS và kết nối database
2. Mở file `backend/src/db/migrations/015_auto_approve_lineups_for_finished_matches.sql`
3. Chạy (F5)

**Command line (sqlcmd):**
```bash
sqlcmd -S localhost -d ChampionLeague -U sa -P yourpassword -i "backend/src/db/migrations/015_auto_approve_lineups_for_finished_matches.sql"
```

## Logic thực thi

1. **Tìm admin user**: Lấy admin user đầu tiên để set `approved_by`
   - Ưu tiên: user có role = 'admin'
   - Nếu không có: user có permission 'manage_matches'
   - Fallback: user đầu tiên trong database

2. **Tìm trận đã kết thúc**: 
   - Status IN ('FINISHED', 'COMPLETED', 'finished', 'completed')

3. **Tìm lineup cần approve**:
   - Của các trận đã kết thúc
   - Chưa được approve (status != 'APPROVED' hoặc NULL)

4. **Cập nhật**:
   - Set `approval_status = 'APPROVED'`
   - Set `approved_by = @adminUserId`
   - Set `approved_at = GETDATE()`

5. **Cập nhật match status** (nếu cần):
   - Nếu cả 2 lineup đã được approve và match chưa ở trạng thái READY hoặc cao hơn
   - Set match status = 'READY'

## An toàn

- Script sử dụng TRANSACTION để đảm bảo tính toàn vẹn dữ liệu
- Nếu có lỗi, tất cả thay đổi sẽ được rollback
- Hiển thị thống kê trước và sau khi cập nhật
- Không xóa hoặc thay đổi dữ liệu hiện có, chỉ cập nhật trạng thái

## Lưu ý

- **Backup database trước khi chạy** (khuyến nghị)
- Script chỉ cập nhật các trận đã kết thúc, không ảnh hưởng đến trận chưa đá
- Script có thể chạy nhiều lần an toàn (idempotent)

