# BÁO CÁO CẤU TRÚC CƠ SỞ DỮ LIỆU

**Ngày tạo:** 06:17:36 30/12/2025

**Tổng số bảng:** 49

**Tổng số cột:** 537

**Tổng số dòng dữ liệu:** 4.898

---

## 📊 Bảng: `audit_events`

**Số cột:** 12 | **Số dòng:** 635

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `audit_event_id` | BIGINT | ❌ Không | - | 🔑 PK | - |
| `event_type` | VARCHAR(100) | ❌ Không | - | - | - |
| `severity` | VARCHAR(32) | ❌ Không | - | - | - |
| `actor_id` | INT | ✅ Có | - | - | - |
| `actor_username` | VARCHAR(150) | ✅ Có | - | - | - |
| `actor_role` | VARCHAR(100) | ✅ Có | - | - | - |
| `entity_type` | VARCHAR(100) | ❌ Không | - | - | - |
| `entity_id` | VARCHAR(100) | ❌ Không | - | - | - |
| `correlation_id` | UNIQUEIDENTIFIER | ❌ Không | `(newid())` | - | - |
| `payload` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `metadata` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |

## 📊 Bảng: `disciplinary_records`

**Số cột:** 15 | **Số dòng:** 0

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `record_id` | INT | ❌ Không | - | 🔑 PK | - |
| `season_id` | INT | ❌ Không | - | - | - |
| `player_id` | INT | ❌ Không | - | - | - |
| `match_id` | INT | ✅ Có | - | - | - |
| `offense_type` | VARCHAR(50) | ❌ Không | - | - | - |
| `offense_date` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `yellow_card_count` | INT | ❌ Không | `((0))` | - | - |
| `red_card_count` | INT | ❌ Không | `((0))` | - | - |
| `is_suspended` | BIT | ❌ Không | `((0))` | - | - |
| `suspension_matches` | INT | ✅ Có | `((0))` | - | - |
| `suspension_start_date` | DATETIME2 | ✅ Có | - | - | - |
| `suspension_end_date` | DATETIME2 | ✅ Có | - | - | - |
| `notes` | NVARCHAR(500) | ✅ Có | - | - | - |
| `created_by` | INT | ✅ Có | - | - | - |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |

## 📊 Bảng: `match_audit_logs`

**Số cột:** 8 | **Số dòng:** 23

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `log_id` | INT | ❌ Không | - | 🔑 PK | - |
| `match_id` | INT | ❌ Không | - | - | 🔗 → matches.match_id |
| `action_type` | NVARCHAR(50) | ❌ Không | - | - | - |
| `details` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `old_value` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `new_value` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `changed_by_user_id` | INT | ✅ Có | - | - | - |
| `created_at` | DATETIME2 | ✅ Có | `(getdate())` | - | - |

## 📊 Bảng: `match_events`

**Số cột:** 17 | **Số dòng:** 825

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `match_event_id` | BIGINT | ❌ Không | - | 🔑 PK | - |
| `match_id` | INT | ❌ Không | - | - | 🔗 → matches.season_id |
| `season_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `season_team_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `season_player_id` | INT | ✅ Có | - | - | 🔗 → season_player_registrations.season_player_id |
| `related_season_player_id` | INT | ✅ Có | - | - | 🔗 → season_player_registrations.season_player_id |
| `ruleset_id` | INT | ❌ Không | - | - | 🔗 → matches.ruleset_id |
| `event_type` | VARCHAR(32) | ❌ Không | - | - | - |
| `event_minute` | TINYINT | ❌ Không | - | - | - |
| `stoppage_time` | TINYINT | ✅ Có | - | - | - |
| `goal_type_code` | VARCHAR(32) | ✅ Có | - | - | - |
| `card_type` | VARCHAR(16) | ✅ Có | - | - | - |
| `description` | NVARCHAR(512) | ✅ Có | - | - | - |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `player_name` | NVARCHAR(100) | ✅ Có | - | - | - |
| `player_id` | INT | ✅ Có | - | - | - |
| `assist_player_id` | INT | ✅ Có | - | - | - |

## 📊 Bảng: `match_formations`

**Số cột:** 6 | **Số dòng:** 3

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `match_formation_id` | INT | ❌ Không | - | 🔑 PK | - |
| `match_id` | INT | ❌ Không | - | - | 🔗 → matches.match_id |
| `season_team_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `formation` | VARCHAR(20) | ❌ Không | - | - | - |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `updated_at` | DATETIME2 | ✅ Có | - | - | - |

## 📊 Bảng: `match_lifecycle_history`

**Số cột:** 7 | **Số dòng:** 0

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `id` | INT | ❌ Không | - | 🔑 PK | - |
| `match_id` | INT | ❌ Không | - | - | - |
| `from_status` | VARCHAR(20) | ✅ Có | - | - | - |
| `to_status` | VARCHAR(20) | ❌ Không | - | - | - |
| `changed_by` | INT | ✅ Có | - | - | - |
| `change_note` | NVARCHAR(500) | ✅ Có | - | - | - |
| `changed_at` | DATETIME2 | ✅ Có | `(sysutcdatetime())` | - | - |

## 📊 Bảng: `match_lineup_players`

**Số cột:** 11 | **Số dòng:** 0

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `lineup_player_id` | INT | ❌ Không | - | 🔑 PK | - |
| `lineup_id` | INT | ❌ Không | - | - | 🔗 → match_lineups.season_id |
| `season_id` | INT | ❌ Không | - | - | 🔗 → season_player_registrations.season_player_id |
| `season_player_id` | INT | ❌ Không | - | - | 🔗 → season_player_registrations.season_player_id |
| `role_code` | VARCHAR(16) | ❌ Không | - | - | - |
| `position_code` | VARCHAR(32) | ✅ Có | - | - | - |
| `shirt_number` | TINYINT | ✅ Có | - | - | - |
| `is_captain` | BIT | ❌ Không | `((0))` | - | - |
| `order_number` | TINYINT | ✅ Có | - | - | - |
| `notes` | NVARCHAR(255) | ✅ Có | - | - | - |
| `is_substitute` | BIT | ✅ Có | `((0))` | - | - |

## 📊 Bảng: `match_lineups`

**Số cột:** 28 | **Số dòng:** 114

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `lineup_id` | INT | ❌ Không | - | 🔑 PK | - |
| `match_id` | INT | ❌ Không | - | - | 🔗 → matches.season_id |
| `season_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `season_team_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `submitted_by` | INT | ❌ Không | - | - | 🔗 → user_accounts.user_id |
| `submitted_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `formation` | VARCHAR(20) | ✅ Có | - | - | - |
| `kit_description` | NVARCHAR(255) | ✅ Có | - | - | - |
| `status` | VARCHAR(32) | ❌ Không | `('pending')` | - | - |
| `reviewed_by` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |
| `reviewed_at` | DATETIME2 | ✅ Có | - | - | - |
| `review_notes` | NVARCHAR(512) | ✅ Có | - | - | - |
| `squad_size` | TINYINT | ❌ Không | `((16))` | - | - |
| `starting_players_count` | TINYINT | ❌ Không | `((11))` | - | - |
| `bench_players_count` | TINYINT | ❌ Không | `((5))` | - | - |
| `notes` | NVARCHAR(512) | ✅ Có | - | - | - |
| `player_id` | INT | ✅ Có | - | - | - |
| `team_type` | VARCHAR(10) | ✅ Có | - | - | - |
| `approval_status` | VARCHAR(20) | ✅ Có | `('PENDING')` | - | - |
| `approved_by` | INT | ✅ Có | - | - | - |
| `approved_at` | DATETIME2 | ✅ Có | - | - | - |
| `rejection_reason` | NVARCHAR(500) | ✅ Có | - | - | - |
| `is_starting` | BIT | ✅ Có | `((1))` | - | - |
| `is_captain` | BIT | ✅ Có | `((0))` | - | - |
| `jersey_number` | TINYINT | ✅ Có | - | - | - |
| `position` | VARCHAR(32) | ✅ Có | - | - | - |
| `minutes_played` | SMALLINT | ✅ Có | - | - | - |
| `updated_at` | DATETIME2 | ✅ Có | - | - | - |

## 📊 Bảng: `match_mvps`

**Số cột:** 4 | **Số dòng:** 0

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `mvp_id` | INT | ❌ Không | - | 🔑 PK | - |
| `match_id` | INT | ❌ Không | - | - | - |
| `player_name` | NVARCHAR(100) | ❌ Không | - | - | - |
| `team_name` | NVARCHAR(100) | ❌ Không | - | - | - |

## 📊 Bảng: `match_official_assignments`

**Số cột:** 7 | **Số dòng:** 16

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `match_official_assignment_id` | INT | ❌ Không | - | 🔑 PK | - |
| `match_id` | INT | ❌ Không | - | - | 🔗 → matches.match_id |
| `official_id` | INT | ❌ Không | - | - | 🔗 → officials.official_id |
| `role_code` | VARCHAR(32) | ❌ Không | - | - | - |
| `assigned_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `assigned_by` | INT | ❌ Không | - | - | 🔗 → user_accounts.user_id |
| `notes` | NVARCHAR(255) | ✅ Có | - | - | - |

## 📊 Bảng: `match_reports`

**Số cột:** 13 | **Số dòng:** 0

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `match_report_id` | INT | ❌ Không | - | 🔑 PK | - |
| `match_id` | INT | ❌ Không | - | - | 🔗 → matches.season_id |
| `season_id` | INT | ❌ Không | - | - | 🔗 → season_player_registrations.season_player_id |
| `reporting_official_id` | INT | ✅ Có | - | - | 🔗 → officials.official_id |
| `submitted_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `home_score` | TINYINT | ❌ Không | - | - | - |
| `away_score` | TINYINT | ❌ Không | - | - | - |
| `player_of_match_id` | INT | ✅ Có | - | - | 🔗 → season_player_registrations.season_player_id |
| `weather` | NVARCHAR(100) | ✅ Có | - | - | - |
| `attendance` | INT | ✅ Có | - | - | - |
| `additional_notes` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `approved_by` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |
| `approved_at` | DATETIME2 | ✅ Có | - | - | - |

## 📊 Bảng: `match_team_infos`

**Số cột:** 7 | **Số dòng:** 2

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `info_id` | INT | ❌ Không | - | 🔑 PK | - |
| `match_id` | INT | ❌ Không | - | - | 🔗 → matches.match_id |
| `season_team_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `formation` | VARCHAR(20) | ❌ Không | `('4-4-2')` | - | - |
| `kit_type` | VARCHAR(20) | ❌ Không | `('HOME')` | - | - |
| `created_at` | DATETIME | ✅ Có | `(getdate())` | - | - |
| `updated_at` | DATETIME | ✅ Có | `(getdate())` | - | - |

## 📊 Bảng: `match_team_statistics`

**Số cột:** 12 | **Số dòng:** 0

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `match_team_stat_id` | BIGINT | ❌ Không | - | 🔑 PK | - |
| `match_id` | INT | ❌ Không | - | - | 🔗 → matches.season_id |
| `season_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `season_team_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `shots_total` | TINYINT | ✅ Có | - | - | - |
| `shots_on_target` | TINYINT | ✅ Có | - | - | - |
| `fouls_committed` | TINYINT | ✅ Có | - | - | - |
| `offsides` | TINYINT | ✅ Có | - | - | - |
| `corners` | TINYINT | ✅ Có | - | - | - |
| `possession_percent` | DECIMAL | ✅ Có | - | - | - |
| `passes_completed` | SMALLINT | ✅ Có | - | - | - |
| `custom_metrics` | NVARCHAR(MAX) | ✅ Có | - | - | - |

## 📊 Bảng: `matches`

**Số cột:** 27 | **Số dòng:** 449

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `match_id` | INT | ❌ Không | - | 🔑 PK | - |
| `season_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `round_id` | INT | ❌ Không | - | - | 🔗 → season_rounds.season_id |
| `matchday_number` | TINYINT | ❌ Không | - | - | - |
| `home_season_team_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `away_season_team_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `stadium_id` | INT | ❌ Không | - | - | 🔗 → stadiums.stadium_id |
| `ruleset_id` | INT | ❌ Không | - | - | 🔗 → rulesets.ruleset_id |
| `scheduled_kickoff` | DATETIME2 | ❌ Không | - | - | - |
| `status` | VARCHAR(32) | ❌ Không | `('scheduled')` | - | - |
| `home_score` | TINYINT | ✅ Có | - | - | - |
| `away_score` | TINYINT | ✅ Có | - | - | - |
| `attendance` | INT | ✅ Có | - | - | - |
| `winner_season_team_id` | INT | ✅ Có | - | - | 🔗 → season_team_participants.season_team_id |
| `match_code` | VARCHAR(50) | ✅ Có | - | - | - |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `updated_at` | DATETIME2 | ✅ Có | - | - | - |
| `home_lineup_status` | VARCHAR(20) | ✅ Có | `('PENDING')` | - | - |
| `away_lineup_status` | VARCHAR(20) | ✅ Có | `('PENDING')` | - | - |
| `main_referee_id` | INT | ✅ Có | - | - | - |
| `assistant_referee_1_id` | INT | ✅ Có | - | - | - |
| `assistant_referee_2_id` | INT | ✅ Có | - | - | - |
| `fourth_official_id` | INT | ✅ Có | - | - | - |
| `supervisor_id` | INT | ✅ Có | - | - | - |
| `referee_report_submitted` | BIT | ✅ Có | `((0))` | - | - |
| `supervisor_report_submitted` | BIT | ✅ Có | `((0))` | - | - |
| `officials_assigned_at` | DATETIME2 | ✅ Có | - | - | - |

## 📊 Bảng: `notifications`

**Số cột:** 11 | **Số dòng:** 0

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `notification_id` | INT | ❌ Không | - | 🔑 PK | - |
| `user_id` | INT | ❌ Không | - | - | - |
| `type` | VARCHAR(50) | ❌ Không | - | - | - |
| `title` | NVARCHAR(255) | ❌ Không | - | - | - |
| `message` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `related_entity` | VARCHAR(50) | ✅ Có | - | - | - |
| `related_id` | INT | ✅ Có | - | - | - |
| `action_url` | NVARCHAR(500) | ✅ Có | - | - | - |
| `is_read` | BIT | ❌ Không | `((0))` | - | - |
| `read_at` | DATETIME2 | ✅ Có | - | - | - |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |

## 📊 Bảng: `officials`

**Số cột:** 10 | **Số dòng:** 7

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `official_id` | INT | ❌ Không | - | 🔑 PK | - |
| `user_id` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |
| `full_name` | NVARCHAR(255) | ❌ Không | - | - | - |
| `role_specialty` | VARCHAR(32) | ❌ Không | - | - | - |
| `license_number` | VARCHAR(50) | ✅ Có | - | - | - |
| `federation_level` | NVARCHAR(100) | ✅ Có | - | - | - |
| `status` | VARCHAR(32) | ❌ Không | `('active')` | - | - |
| `notes` | NVARCHAR(512) | ✅ Có | - | - | - |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `updated_at` | DATETIME2 | ✅ Có | - | - | - |

## 📊 Bảng: `permissions`

**Số cột:** 4 | **Số dòng:** 10

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `permission_id` | INT | ❌ Không | - | 🔑 PK | - |
| `code` | VARCHAR(150) | ❌ Không | - | - | - |
| `name` | NVARCHAR(150) | ❌ Không | - | - | - |
| `description` | NVARCHAR(512) | ✅ Có | - | - | - |

## 📊 Bảng: `player_match_stats`

**Số cột:** 14 | **Số dòng:** 0

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `player_match_stat_id` | BIGINT | ❌ Không | - | 🔑 PK | - |
| `match_id` | INT | ❌ Không | - | - | 🔗 → matches.season_id |
| `season_id` | INT | ❌ Không | - | - | 🔗 → season_player_registrations.season_player_id |
| `season_player_id` | INT | ❌ Không | - | - | 🔗 → season_player_registrations.season_player_id |
| `minutes_played` | TINYINT | ✅ Có | - | - | - |
| `goals` | TINYINT | ❌ Không | `((0))` | - | - |
| `assists` | TINYINT | ❌ Không | `((0))` | - | - |
| `shots` | TINYINT | ❌ Không | `((0))` | - | - |
| `shots_on_target` | TINYINT | ❌ Không | `((0))` | - | - |
| `yellow_cards` | TINYINT | ❌ Không | `((0))` | - | - |
| `red_cards` | TINYINT | ❌ Không | `((0))` | - | - |
| `player_of_match` | BIT | ❌ Không | `((0))` | - | - |
| `is_starting` | BIT | ❌ Không | `((0))` | - | - |
| `notes` | NVARCHAR(512) | ✅ Có | - | - | - |

## 📊 Bảng: `player_suspensions`

**Số cột:** 13 | **Số dòng:** 0

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `suspension_id` | INT | ❌ Không | - | 🔑 PK | - |
| `season_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `season_player_id` | INT | ❌ Không | - | - | 🔗 → season_player_registrations.season_player_id |
| `season_team_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `reason` | VARCHAR(32) | ❌ Không | - | - | - |
| `trigger_match_id` | INT | ✅ Có | - | - | 🔗 → matches.match_id |
| `matches_banned` | TINYINT | ❌ Không | `((1))` | - | - |
| `start_match_id` | INT | ✅ Có | - | - | 🔗 → matches.match_id |
| `served_matches` | TINYINT | ❌ Không | `((0))` | - | - |
| `status` | VARCHAR(16) | ❌ Không | `('active')` | - | - |
| `notes` | NVARCHAR(512) | ✅ Có | - | - | - |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `updated_at` | DATETIME2 | ✅ Có | - | - | - |

## 📊 Bảng: `players`

**Số cột:** 21 | **Số dòng:** 975

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `player_id` | INT | ❌ Không | - | 🔑 PK | - |
| `full_name` | NVARCHAR(255) | ❌ Không | - | - | - |
| `display_name` | NVARCHAR(150) | ✅ Có | - | - | - |
| `date_of_birth` | DATE | ❌ Không | - | - | - |
| `place_of_birth` | NVARCHAR(150) | ✅ Có | - | - | - |
| `nationality` | NVARCHAR(100) | ❌ Không | - | - | - |
| `preferred_position` | VARCHAR(50) | ✅ Có | - | - | - |
| `secondary_position` | VARCHAR(50) | ✅ Có | - | - | - |
| `height_cm` | TINYINT | ✅ Có | - | - | - |
| `weight_kg` | TINYINT | ✅ Có | - | - | - |
| `biography` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `dominant_foot` | VARCHAR(12) | ✅ Có | - | - | - |
| `current_team_id` | INT | ✅ Có | - | - | 🔗 → teams.team_id |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `created_by` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |
| `updated_at` | DATETIME2 | ✅ Có | - | - | - |
| `updated_by` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |
| `avatar_url` | NVARCHAR(1024) | ✅ Có | - | - | - |
| `legacy_football_player_id` | INT | ✅ Có | - | - | - |
| `external_key` | NVARCHAR(100) | ✅ Có | - | - | - |
| `shirt_number` | INT | ✅ Có | - | - | - |

## 📊 Bảng: `role_permissions`

**Số cột:** 2 | **Số dòng:** 21

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `role_id` | INT | ❌ Không | - | 🔑 PK | 🔗 → roles.role_id |
| `permission_id` | INT | ❌ Không | - | 🔑 PK | 🔗 → permissions.permission_id |

## 📊 Bảng: `roles`

**Số cột:** 5 | **Số dòng:** 6

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `role_id` | INT | ❌ Không | - | 🔑 PK | - |
| `code` | VARCHAR(100) | ❌ Không | - | - | - |
| `name` | NVARCHAR(150) | ❌ Không | - | - | - |
| `description` | NVARCHAR(512) | ✅ Có | - | - | - |
| `is_system_role` | BIT | ❌ Không | `((0))` | - | - |

## 📊 Bảng: `ruleset_audit_log`

**Số cột:** 7 | **Số dòng:** 0

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `audit_id` | INT | ❌ Không | - | 🔑 PK | - |
| `ruleset_id` | INT | ❌ Không | - | - | 🔗 → rulesets.ruleset_id |
| `action` | VARCHAR(64) | ❌ Không | - | - | - |
| `actor_id` | INT | ❌ Không | - | - | - |
| `actor_username` | VARCHAR(150) | ❌ Không | - | - | - |
| `details` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |

## 📊 Bảng: `ruleset_goal_types`

**Số cột:** 8 | **Số dòng:** 5

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `goal_type_id` | INT | ❌ Không | - | 🔑 PK | - |
| `ruleset_id` | INT | ❌ Không | - | - | 🔗 → rulesets.ruleset_id |
| `code` | VARCHAR(32) | ❌ Không | - | - | - |
| `name` | NVARCHAR(100) | ❌ Không | - | - | - |
| `description` | NVARCHAR(255) | ✅ Có | - | - | - |
| `minute_min` | TINYINT | ❌ Không | `((0))` | - | - |
| `minute_max` | TINYINT | ❌ Không | `((90))` | - | - |
| `is_active` | BIT | ❌ Không | `((1))` | - | - |

## 📊 Bảng: `ruleset_match_constraints`

**Số cột:** 8 | **Số dòng:** 1

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `match_constraint_id` | INT | ❌ Không | - | 🔑 PK | - |
| `ruleset_id` | INT | ❌ Không | - | - | 🔗 → rulesets.ruleset_id |
| `total_rounds` | TINYINT | ❌ Không | - | - | - |
| `teams_per_season` | TINYINT | ❌ Không | - | - | - |
| `home_away_balance` | BIT | ❌ Không | `((1))` | - | - |
| `max_matches_per_day` | TINYINT | ✅ Có | - | - | - |
| `min_rest_days` | TINYINT | ✅ Có | - | - | - |
| `notes` | NVARCHAR(255) | ✅ Có | - | - | - |

## 📊 Bảng: `ruleset_player_constraints`

**Số cột:** 7 | **Số dòng:** 2

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `constraint_id` | INT | ❌ Không | - | 🔑 PK | - |
| `ruleset_id` | INT | ❌ Không | - | - | 🔗 → rulesets.ruleset_id |
| `min_age` | TINYINT | ❌ Không | - | - | - |
| `max_age` | TINYINT | ❌ Không | - | - | - |
| `max_players` | TINYINT | ❌ Không | - | - | - |
| `max_foreign_players` | TINYINT | ❌ Không | - | - | - |
| `squad_registration_deadline` | DATE | ✅ Có | - | - | - |

## 📊 Bảng: `ruleset_ranking_rules`

**Số cột:** 6 | **Số dòng:** 2

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `ranking_id` | INT | ❌ Không | - | 🔑 PK | - |
| `ruleset_id` | INT | ❌ Không | - | - | 🔗 → rulesets.ruleset_id |
| `points_for_win` | TINYINT | ❌ Không | - | - | - |
| `points_for_draw` | TINYINT | ❌ Không | - | - | - |
| `points_for_loss` | TINYINT | ❌ Không | - | - | - |
| `tie_breaking_order` | NVARCHAR(MAX) | ❌ Không | - | - | - |

## 📊 Bảng: `ruleset_scoring_rules`

**Số cột:** 4 | **Số dòng:** 2

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `scoring_id` | INT | ❌ Không | - | 🔑 PK | - |
| `ruleset_id` | INT | ❌ Không | - | - | 🔗 → rulesets.ruleset_id |
| `max_goal_time` | TINYINT | ❌ Không | - | - | - |
| `accepted_goal_types` | NVARCHAR(MAX) | ❌ Không | - | - | - |

## 📊 Bảng: `ruleset_team_requirements`

**Số cột:** 8 | **Số dòng:** 1

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `team_requirement_id` | INT | ❌ Không | - | 🔑 PK | - |
| `ruleset_id` | INT | ❌ Không | - | - | 🔗 → rulesets.ruleset_id |
| `min_registered_players` | TINYINT | ❌ Không | - | - | - |
| `min_goalkeepers` | TINYINT | ❌ Không | - | - | - |
| `max_foreign_on_match_sheet` | TINYINT | ❌ Không | - | - | - |
| `min_stadium_capacity` | INT | ❌ Không | - | - | - |
| `min_stadium_rating` | TINYINT | ❌ Không | - | - | - |
| `notes` | NVARCHAR(255) | ✅ Có | - | - | - |

## 📊 Bảng: `rulesets`

**Số cột:** 11 | **Số dòng:** 3

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `ruleset_id` | INT | ❌ Không | - | 🔑 PK | - |
| `name` | VARCHAR(255) | ❌ Không | - | - | - |
| `version_tag` | VARCHAR(64) | ❌ Không | - | - | - |
| `description` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `is_active` | BIT | ❌ Không | `((0))` | - | - |
| `effective_from` | DATE | ✅ Có | - | - | - |
| `effective_to` | DATE | ✅ Có | - | - | - |
| `created_by` | INT | ❌ Không | - | - | - |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `updated_by` | INT | ✅ Có | - | - | - |
| `updated_at` | DATETIME2 | ✅ Có | - | - | - |

## 📊 Bảng: `season_invitations`

**Số cột:** 12 | **Số dòng:** 11

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `invitation_id` | INT | ❌ Không | - | 🔑 PK | - |
| `season_id` | INT | ❌ Không | - | - | 🔗 → seasons.season_id |
| `team_id` | INT | ❌ Không | - | - | 🔗 → teams.team_id |
| `invite_type` | VARCHAR(32) | ❌ Không | - | - | - |
| `status` | VARCHAR(32) | ❌ Không | `('pending')` | - | - |
| `invited_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `response_deadline` | DATETIME2 | ❌ Không | - | - | - |
| `responded_at` | DATETIME2 | ✅ Có | - | - | - |
| `response_notes` | NVARCHAR(512) | ✅ Có | - | - | - |
| `invited_by` | INT | ❌ Không | - | - | 🔗 → user_accounts.user_id |
| `responded_by` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |
| `replacement_for_id` | INT | ✅ Có | - | - | 🔗 → season_invitations.invitation_id |

## 📊 Bảng: `season_player_registrations`

**Số cột:** 22 | **Số dòng:** 1.459

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `season_player_id` | INT | ❌ Không | - | 🔑 PK | - |
| `season_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `season_team_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `player_id` | INT | ❌ Không | - | - | 🔗 → players.player_id |
| `registration_status` | VARCHAR(32) | ❌ Không | `('pending')` | - | - |
| `player_type` | VARCHAR(32) | ❌ Không | - | - | - |
| `is_foreign` | BIT | ❌ Không | `((0))` | - | - |
| `shirt_number` | TINYINT | ✅ Có | - | - | - |
| `position_code` | VARCHAR(32) | ✅ Có | - | - | - |
| `age_on_season_start` | TINYINT | ✅ Có | - | - | - |
| `height_cm` | TINYINT | ✅ Có | - | - | - |
| `weight_kg` | TINYINT | ✅ Có | - | - | - |
| `biography` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `notes` | NVARCHAR(500) | ✅ Có | - | - | - |
| `registered_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `approved_at` | DATETIME2 | ✅ Có | - | - | - |
| `approved_by` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |
| `file_path` | NVARCHAR(255) | ✅ Có | - | - | - |
| `position` | NVARCHAR(100) | ✅ Có | - | - | - |
| `jersey_number` | INT | ✅ Có | - | - | - |
| `created_by` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |
| `reject_reason` | NVARCHAR(255) | ✅ Có | - | - | - |

## 📊 Bảng: `season_registration_status_history`

**Số cột:** 7 | **Số dòng:** 16

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `id` | INT | ❌ Không | - | 🔑 PK | - |
| `registration_id` | INT | ❌ Không | - | - | - |
| `from_status` | VARCHAR(32) | ✅ Có | - | - | - |
| `to_status` | VARCHAR(32) | ❌ Không | - | - | - |
| `changed_by` | INT | ✅ Có | - | - | - |
| `note` | NVARCHAR(1000) | ✅ Có | - | - | - |
| `changed_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |

## 📊 Bảng: `season_rounds`

**Số cột:** 7 | **Số dòng:** 70

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `round_id` | INT | ❌ Không | - | 🔑 PK | - |
| `season_id` | INT | ❌ Không | - | - | 🔗 → seasons.season_id |
| `round_number` | TINYINT | ❌ Không | - | - | - |
| `name` | NVARCHAR(100) | ❌ Không | - | - | - |
| `start_date` | DATE | ✅ Có | - | - | - |
| `end_date` | DATE | ✅ Có | - | - | - |
| `status` | VARCHAR(32) | ❌ Không | `('planned')` | - | - |

## 📊 Bảng: `season_ruleset_assignments`

**Số cột:** 5 | **Số dòng:** 0

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `season_ruleset_id` | INT | ❌ Không | - | 🔑 PK | - |
| `season_id` | INT | ❌ Không | - | - | - |
| `ruleset_id` | INT | ❌ Không | - | - | 🔗 → rulesets.ruleset_id |
| `assigned_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `assigned_by` | INT | ❌ Không | - | - | - |

## 📊 Bảng: `season_status_history`

**Số cột:** 7 | **Số dòng:** 4

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `season_status_history_id` | BIGINT | ❌ Không | - | 🔑 PK | - |
| `season_id` | INT | ❌ Không | - | - | 🔗 → seasons.season_id |
| `from_status` | VARCHAR(32) | ✅ Có | - | - | - |
| `to_status` | VARCHAR(32) | ❌ Không | - | - | - |
| `changed_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `changed_by` | INT | ❌ Không | - | - | 🔗 → user_accounts.user_id |
| `note` | NVARCHAR(512) | ✅ Có | - | - | - |

## 📊 Bảng: `season_team_participants`

**Số cột:** 7 | **Số dòng:** 49

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `season_team_id` | INT | ❌ Không | - | 🔑 PK | - |
| `season_id` | INT | ❌ Không | - | - | 🔗 → seasons.season_id |
| `team_id` | INT | ❌ Không | - | - | 🔗 → teams.team_id |
| `registration_id` | INT | ✅ Có | - | - | 🔗 → season_team_registrations.registration_id |
| `seed_number` | TINYINT | ✅ Có | - | - | - |
| `status` | VARCHAR(32) | ❌ Không | `('pending')` | - | - |
| `joined_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |

## 📊 Bảng: `season_team_registrations`

**Số cột:** 24 | **Số dòng:** 33

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `registration_id` | INT | ❌ Không | - | 🔑 PK | - |
| `season_id` | INT | ❌ Không | - | - | 🔗 → seasons.season_id |
| `team_id` | INT | ❌ Không | - | - | 🔗 → teams.team_id |
| `invitation_id` | INT | ✅ Có | - | - | 🔗 → season_invitations.invitation_id |
| `fee_status` | VARCHAR(32) | ❌ Không | `('unpaid')` | - | - |
| `registration_status` | VARCHAR(32) | ❌ Không | `('draft')` | - | - |
| `submitted_at` | DATETIME2 | ✅ Có | - | - | - |
| `reviewed_at` | DATETIME2 | ✅ Có | - | - | - |
| `reviewed_by` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |
| `review_notes` | NVARCHAR(1000) | ✅ Có | - | - | - |
| `governing_body` | NVARCHAR(255) | ✅ Có | - | - | - |
| `city` | NVARCHAR(150) | ✅ Có | - | - | - |
| `home_stadium_name` | NVARCHAR(255) | ❌ Không | - | - | - |
| `home_stadium_capacity` | INT | ❌ Không | - | - | - |
| `home_stadium_rating` | TINYINT | ❌ Không | - | - | - |
| `kit_description` | NVARCHAR(255) | ✅ Có | - | - | - |
| `squad_size` | TINYINT | ❌ Không | - | - | - |
| `foreign_player_count` | TINYINT | ❌ Không | - | - | - |
| `dossier_url` | NVARCHAR(500) | ✅ Có | - | - | - |
| `notes` | NVARCHAR(1000) | ✅ Có | - | - | - |
| `submission_data` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `reviewer_note` | NVARCHAR(1000) | ✅ Có | - | - | - |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `updated_at` | DATETIME2 | ✅ Có | - | - | - |

## 📊 Bảng: `season_team_statistics`

**Số cột:** 13 | **Số dòng:** 48

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `season_team_stat_id` | BIGINT | ❌ Không | - | 🔑 PK | - |
| `season_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `season_team_id` | INT | ❌ Không | - | - | 🔗 → season_team_participants.season_team_id |
| `matches_played` | TINYINT | ❌ Không | `((0))` | - | - |
| `wins` | TINYINT | ❌ Không | `((0))` | - | - |
| `draws` | TINYINT | ❌ Không | `((0))` | - | - |
| `losses` | TINYINT | ❌ Không | `((0))` | - | - |
| `goals_for` | TINYINT | ❌ Không | `((0))` | - | - |
| `goals_against` | TINYINT | ❌ Không | `((0))` | - | - |
| `points` | TINYINT | ❌ Không | `((0))` | - | - |
| `current_rank` | TINYINT | ✅ Có | - | - | - |
| `last_updated_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `goal_difference` | INT | ✅ Có | - | - | - |

## 📊 Bảng: `seasons`

**Số cột:** 18 | **Số dòng:** 3

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `season_id` | INT | ❌ Không | - | 🔑 PK | - |
| `tournament_id` | INT | ❌ Không | - | - | 🔗 → tournaments.tournament_id |
| `ruleset_id` | INT | ❌ Không | - | - | 🔗 → rulesets.ruleset_id |
| `name` | NVARCHAR(255) | ❌ Không | - | - | - |
| `code` | VARCHAR(64) | ❌ Không | - | - | - |
| `description` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `start_date` | DATE | ❌ Không | - | - | - |
| `end_date` | DATE | ✅ Có | - | - | - |
| `participation_fee` | DECIMAL | ❌ Không | - | - | - |
| `max_teams` | TINYINT | ❌ Không | `((10))` | - | - |
| `expected_rounds` | TINYINT | ❌ Không | `((18))` | - | - |
| `status` | VARCHAR(32) | ❌ Không | `('draft')` | - | - |
| `invitation_opened_at` | DATETIME2 | ✅ Có | - | - | - |
| `registration_deadline` | DATETIME2 | ✅ Có | - | - | - |
| `created_by` | INT | ❌ Không | - | - | 🔗 → user_accounts.user_id |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `updated_by` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |
| `updated_at` | DATETIME2 | ✅ Có | - | - | - |

## 📊 Bảng: `stadiums`

**Số cột:** 15 | **Số dòng:** 47

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `stadium_id` | INT | ❌ Không | - | 🔑 PK | - |
| `name` | NVARCHAR(255) | ❌ Không | - | - | - |
| `city` | NVARCHAR(150) | ❌ Không | - | - | - |
| `province` | NVARCHAR(150) | ✅ Có | - | - | - |
| `address` | NVARCHAR(255) | ✅ Có | - | - | - |
| `capacity` | INT | ❌ Không | - | - | - |
| `surface_type` | VARCHAR(64) | ✅ Có | - | - | - |
| `rating_stars` | TINYINT | ✅ Có | - | - | - |
| `owner` | NVARCHAR(255) | ✅ Có | - | - | - |
| `contact_phone` | VARCHAR(32) | ✅ Có | - | - | - |
| `is_certified` | BIT | ❌ Không | `((0))` | - | - |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `created_by` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |
| `updated_at` | DATETIME2 | ✅ Có | - | - | - |
| `updated_by` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |

## 📊 Bảng: `supervisor_reports`

**Số cột:** 17 | **Số dòng:** 0

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `id` | INT | ❌ Không | - | 🔑 PK | - |
| `match_id` | INT | ❌ Không | - | - | - |
| `supervisor_id` | INT | ❌ Không | - | - | - |
| `organization_rating` | INT | ✅ Có | - | - | - |
| `home_team_rating` | INT | ✅ Có | - | - | - |
| `away_team_rating` | INT | ✅ Có | - | - | - |
| `stadium_condition_rating` | INT | ✅ Có | - | - | - |
| `security_rating` | INT | ✅ Có | - | - | - |
| `incident_report` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `has_serious_violation` | BIT | ✅ Có | `((0))` | - | - |
| `send_to_disciplinary` | BIT | ✅ Có | `((0))` | - | - |
| `recommendations` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `reviewed_by` | INT | ✅ Có | - | - | - |
| `reviewed_at` | DATETIME2 | ✅ Có | - | - | - |
| `review_notes` | NVARCHAR(1000) | ✅ Có | - | - | - |
| `submitted_at` | DATETIME2 | ✅ Có | `(sysutcdatetime())` | - | - |
| `created_at` | DATETIME2 | ✅ Có | `(sysutcdatetime())` | - | - |

## 📊 Bảng: `team_kits`

**Số cột:** 8 | **Số dòng:** 0

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `kit_id` | INT | ❌ Không | - | 🔑 PK | - |
| `team_id` | INT | ❌ Không | - | - | 🔗 → teams.team_id |
| `season_id` | INT | ✅ Có | - | - | 🔗 → seasons.season_id |
| `kit_type` | VARCHAR(32) | ❌ Không | - | - | - |
| `primary_color` | VARCHAR(32) | ✅ Có | - | - | - |
| `secondary_color` | VARCHAR(32) | ✅ Có | - | - | - |
| `pattern_description` | NVARCHAR(255) | ✅ Có | - | - | - |
| `registered_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |

## 📊 Bảng: `teams`

**Số cột:** 24 | **Số dòng:** 23

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `team_id` | INT | ❌ Không | - | 🔑 PK | - |
| `name` | NVARCHAR(255) | ❌ Không | - | - | - |
| `short_name` | VARCHAR(50) | ✅ Có | - | - | - |
| `code` | VARCHAR(32) | ✅ Có | - | - | - |
| `governing_body` | NVARCHAR(255) | ✅ Có | - | - | - |
| `city` | NVARCHAR(150) | ✅ Có | - | - | - |
| `country` | NVARCHAR(100) | ✅ Có | - | - | - |
| `home_stadium_id` | INT | ✅ Có | - | - | 🔗 → stadiums.stadium_id |
| `founded_year` | SMALLINT | ✅ Có | - | - | - |
| `description` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `home_kit_description` | NVARCHAR(255) | ✅ Có | - | - | - |
| `status` | VARCHAR(32) | ❌ Không | `('active')` | - | - |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `created_by` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |
| `updated_at` | DATETIME2 | ✅ Có | - | - | - |
| `updated_by` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |
| `logo_url` | VARCHAR(500) | ✅ Có | - | - | - |
| `stadium_id` | INT | ✅ Có | - | - | 🔗 → stadiums.stadium_id |
| `governing_body_in_vietnam` | BIT | ✅ Có | `((0))` | - | - |
| `phone` | VARCHAR(32) | ✅ Có | - | - | - |
| `email` | VARCHAR(255) | ✅ Có | - | - | - |
| `stadium_name` | NVARCHAR(255) | ✅ Có | - | - | - |
| `stadium_capacity` | INT | ✅ Có | - | - | - |
| `website` | VARCHAR(255) | ✅ Có | - | - | - |

## 📊 Bảng: `tournaments`

**Số cột:** 12 | **Số dòng:** 5

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `tournament_id` | INT | ❌ Không | - | 🔑 PK | - |
| `code` | VARCHAR(64) | ❌ Không | - | - | - |
| `name` | NVARCHAR(255) | ❌ Không | - | - | - |
| `description` | NVARCHAR(MAX) | ✅ Có | - | - | - |
| `organizer` | NVARCHAR(255) | ✅ Có | - | - | - |
| `founded_year` | SMALLINT | ✅ Có | - | - | - |
| `region` | NVARCHAR(150) | ✅ Có | - | - | - |
| `is_active` | BIT | ❌ Không | `((1))` | - | - |
| `created_by` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `updated_by` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |
| `updated_at` | DATETIME2 | ✅ Có | - | - | - |

## 📊 Bảng: `user_accounts`

**Số cột:** 15 | **Số dòng:** 12

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `user_id` | INT | ❌ Không | - | 🔑 PK | - |
| `username` | VARCHAR(150) | ❌ Không | - | - | - |
| `email` | VARCHAR(255) | ❌ Không | - | - | - |
| `password_hash` | VARBINARY | ❌ Không | - | - | - |
| `first_name` | NVARCHAR(100) | ❌ Không | - | - | - |
| `last_name` | NVARCHAR(100) | ❌ Không | - | - | - |
| `status` | VARCHAR(32) | ❌ Không | `('active')` | - | - |
| `last_login_at` | DATETIME2 | ✅ Có | - | - | - |
| `must_reset_password` | BIT | ❌ Không | `((0))` | - | - |
| `mfa_enabled` | BIT | ❌ Không | `((0))` | - | - |
| `created_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `created_by` | INT | ✅ Có | - | - | - |
| `updated_at` | DATETIME2 | ✅ Có | - | - | - |
| `updated_by` | INT | ✅ Có | - | - | - |
| `full_name` | NVARCHAR(200) | ✅ Có | - | - | - |

## 📊 Bảng: `user_role_assignments`

**Số cột:** 4 | **Số dòng:** 11

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `user_id` | INT | ❌ Không | - | 🔑 PK | 🔗 → user_accounts.user_id |
| `role_id` | INT | ❌ Không | - | 🔑 PK | 🔗 → roles.role_id |
| `assigned_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `assigned_by` | INT | ❌ Không | - | - | - |

## 📊 Bảng: `user_session_lockouts`

**Số cột:** 3 | **Số dòng:** 0

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `user_id` | INT | ❌ Không | - | 🔑 PK | 🔗 → user_accounts.user_id |
| `locked_until` | DATETIME2 | ❌ Không | - | - | - |
| `failed_attempts` | TINYINT | ❌ Không | `((0))` | - | - |

## 📊 Bảng: `user_team_assignments`

**Số cột:** 4 | **Số dòng:** 5

| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |
|---------|--------------|----------|----------|------------|------------|
| `user_id` | INT | ❌ Không | - | 🔑 PK | 🔗 → user_accounts.user_id |
| `team_id` | INT | ❌ Không | - | 🔑 PK | 🔗 → teams.team_id |
| `assigned_at` | DATETIME2 | ❌ Không | `(sysutcdatetime())` | - | - |
| `assigned_by` | INT | ✅ Có | - | - | 🔗 → user_accounts.user_id |

