# Database Migrations - State Machine Workflow

## ⚠️ QUAN TRỌNG: Thứ tự chạy migrations

### Bước 1: Chạy Schema gốc TRƯỚC (BẮT BUỘC)

Chạy file trong `backend/src/data/migrations/`:

```sql
-- Chạy file này TRƯỚC TIÊN
20250205_full_system_schema.sql
```

File này tạo tất cả các bảng cơ bản: `seasons`, `teams`, `matches`, `season_team_registrations`, `match_lineups`, etc.

### Bước 2: Chạy Seed data (tùy chọn)

```sql
20250205_seed_admin_roles.sql
```

### Bước 3: Chạy State Machine migrations

Sau khi đã chạy schema gốc, chạy các file trong `backend/src/db/migrations/` theo thứ tự:

```
1. 001_add_registration_status.sql          - Thêm status cho season_player_registrations
2. 003_match_lifecycle_integration_FIXED.sql - Match lifecycle workflow  
3. 004_season_registration_state_machine.sql - Season registration workflow ⭐
4. 005_extend_match_lineups_for_service.sql  - Lineup service compatibility ⭐
```

## Cách chạy migration

### Option 1: SQL Server Management Studio (SSMS)
1. Mở SSMS và kết nối database
2. **Mở `backend/src/data/migrations/20250205_full_system_schema.sql` TRƯỚC**
3. Chạy (F5)
4. Sau đó mở và chạy từng file trong `backend/src/db/migrations/` theo thứ tự

### Option 2: Command line (sqlcmd)

```bash
# Bước 1: Chạy schema gốc
cd C:\Web\ChampionLeagueManagement

sqlcmd -S localhost -d ChampionLeague -U sa -P yourpassword -i "backend/src/data/migrations/20250205_full_system_schema.sql"

# Bước 2: Chạy state machine migrations
sqlcmd -S localhost -d ChampionLeague -U sa -P yourpassword -i "backend/src/db/migrations/001_add_registration_status.sql"
sqlcmd -S localhost -d ChampionLeague -U sa -P yourpassword -i "backend/src/db/migrations/003_match_lifecycle_integration_FIXED.sql"
sqlcmd -S localhost -d ChampionLeague -U sa -P yourpassword -i "backend/src/db/migrations/004_season_registration_state_machine.sql"
sqlcmd -S localhost -d ChampionLeague -U sa -P yourpassword -i "backend/src/db/migrations/005_extend_match_lineups_for_service.sql"
```

## Kiểm tra sau khi chạy

### Kiểm tra các bảng cơ bản đã tồn tại
```sql
SELECT name FROM sys.tables 
WHERE name IN (
    'seasons', 'teams', 'matches', 
    'season_team_registrations', 'season_player_registrations',
    'match_lineups', 'user_accounts'
)
ORDER BY name;
```

### Kiểm tra season_team_registrations có đủ cột
```sql
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'season_team_registrations'
ORDER BY ORDINAL_POSITION;

-- Các cột mới cần có sau migration 004:
-- submission_data, reviewer_note, invited_at, response_deadline, accepted_at, updated_at
```

### Kiểm tra bảng mới đã tạo
```sql
-- Bảng audit trail cho registration
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'season_registration_status_history')
    PRINT 'season_registration_status_history: OK'

-- Bảng audit trail cho match lifecycle  
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'match_lifecycle_history')
    PRINT 'match_lifecycle_history: OK'

-- Bảng supervisor reports
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'supervisor_reports')
    PRINT 'supervisor_reports: OK'

-- Bảng kỷ luật
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'disciplinary_records')
    PRINT 'disciplinary_records: OK'
```

### Kiểm tra matches có cột mới
```sql
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'matches'
AND COLUMN_NAME IN (
    'home_lineup_status', 'away_lineup_status', 
    'main_referee_id', 'supervisor_id',
    'referee_report_submitted', 'supervisor_report_submitted',
    'officials_assigned_at', 'lineups_approved_at'
);
```

## Lỗi thường gặp

### Lỗi: "Cannot find the object 'dbo.xxx' because it does not exist"

**Nguyên nhân:** Chưa chạy schema gốc `20250205_full_system_schema.sql`

**Giải pháp:** 
1. Chạy `backend/src/data/migrations/20250205_full_system_schema.sql` trước
2. Sau đó chạy lại migration bị lỗi

### Lỗi: Constraint violation

**Nguyên nhân:** Data hiện có không phù hợp với constraint mới

**Giải pháp:** Migration đã có logic normalize data trước khi thêm constraint mới

## Lưu ý

1. **BACKUP database trước khi chạy migrations**
2. Các migration đã được thiết kế idempotent (chạy nhiều lần không lỗi)
3. Mỗi migration có pre-check để báo lỗi sớm nếu thiếu bảng cần thiết
4. Kiểm tra PRINT messages sau khi chạy để xác nhận thành công
