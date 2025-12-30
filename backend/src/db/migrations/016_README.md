# Migration 016: Tạo và duyệt lineup cho các trận đã có kết quả

## Mục đích

Chuẩn hóa dữ liệu cho các trận đấu đã có kết quả nhưng chưa có lineup. Script này sẽ:
- Tìm các trận đã có kết quả (home_score, away_score không null) nhưng chưa có lineup
- Từ match_events và player_match_stats, lấy danh sách cầu thủ đã thi đấu
- Tạo lineup cho các cầu thủ đó với approval_status = 'APPROVED'
- Set team_type (home/away) và các thông tin cần thiết

## Vấn đề cần giải quyết

Có các trận đấu đã có kết quả (đã nạp thẳng vào database) nhưng:
- Chưa có lineup (match_lineups)
- Chưa có trạng thái duyệt (approval_status)

Điều này không hợp lý vì:
- Nếu trận đã đá xong và có kết quả thì phải đã có lineup và đã được duyệt
- Các mùa cũ là dữ liệu đã nạp, cần chuẩn hóa trạng thái

## Logic thực thi

1. **Tìm admin user**: Lấy admin user đầu tiên để set `approved_by` và `submitted_by`
   - Ưu tiên: user có role code/name chứa 'admin'
   - Nếu không có: user có permission chứa 'match'
   - Fallback: user đầu tiên trong database

2. **Tìm trận cần tạo lineup**: 
   - Có home_score và away_score không null
   - Chưa có lineup cho cả home và away team

3. **Lấy danh sách cầu thủ**:
   - **Ưu tiên**: Từ `player_match_stats` (chính xác hơn, có is_starting)
   - **Fallback**: Từ `match_events` (nếu không có trong player_match_stats)
   - Lấy thông tin: player_id, jersey_number, position từ season_player_registrations

4. **Tạo lineup**:
   - Cho home team và away team riêng biệt
   - Set team_type = 'home' hoặc 'away'
   - Set approval_status = 'APPROVED' (vì trận đã hoàn thành)
   - Set approved_by và approved_at
   - Set submitted_by và submitted_at
   - Set is_starting từ player_match_stats (hoặc mặc định 1 nếu lấy từ events)

## Cách chạy

### Option 1: Chạy trực tiếp SQL file (Khuyến nghị)

**SQL Server Management Studio (SSMS):**
1. Mở SSMS và kết nối database
2. Mở file `backend/src/db/migrations/016_create_and_approve_lineups_for_completed_matches.sql`
3. Chạy (F5)

**Command line (sqlcmd):**
```bash
sqlcmd -S localhost -d ChampionLeague -U sa -P yourpassword -i "backend/src/db/migrations/016_create_and_approve_lineups_for_completed_matches.sql"
```

### Option 2: Chạy qua TypeScript script (nếu có)

```bash
cd ChampionLeagueManagement/backend
npx ts-node scripts/create_lineups_for_completed_matches.ts
```

## An toàn

- Script sử dụng TRANSACTION để đảm bảo tính toàn vẹn dữ liệu
- Nếu có lỗi, tất cả thay đổi sẽ được rollback
- Hiển thị thống kê trước và sau khi tạo lineup
- Chỉ tạo lineup cho các trận đã có kết quả, không ảnh hưởng đến trận chưa đá
- Kiểm tra trùng lặp trước khi insert (không tạo duplicate)

## Lưu ý

- **Backup database trước khi chạy** (khuyến nghị)
- Script chỉ tạo lineup cho các trận đã có kết quả, không ảnh hưởng đến trận chưa đá
- Script có thể chạy nhiều lần an toàn (idempotent) - sẽ bỏ qua các lineup đã tồn tại
- Nếu không có dữ liệu trong player_match_stats hoặc match_events, sẽ không tạo được lineup

## Kết quả mong đợi

Sau khi chạy:
- Tất cả các trận đã có kết quả sẽ có lineup
- Tất cả lineup sẽ có approval_status = 'APPROVED'
- Các cầu thủ sẽ được phân loại đúng starting/substitute (nếu có trong player_match_stats)
- Team_type sẽ được set đúng (home/away)

## Troubleshooting

**Không tạo được lineup:**
- Kiểm tra xem có dữ liệu trong match_events hoặc player_match_stats không
- Kiểm tra xem season_player_registrations có đúng season_team_id không

**Thiếu cầu thủ trong lineup:**
- Có thể cầu thủ đó không có trong match_events hoặc player_match_stats
- Cần kiểm tra và bổ sung dữ liệu thủ công nếu cần


