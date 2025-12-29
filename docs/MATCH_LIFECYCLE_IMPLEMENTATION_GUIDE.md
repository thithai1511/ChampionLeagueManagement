# Match Lifecycle Workflow - Implementation Guide

## Tổng quan

Hệ thống quản lý vòng đời trận đấu (Match Lifecycle Workflow) giúp tự động hóa và chuẩn hóa quy trình tổ chức trận đấu từ khi lên lịch đến khi hoàn thành.

## Sơ đồ trạng thái (State Machine)

```
SCHEDULED → PREPARING → READY → IN_PROGRESS → FINISHED → REPORTED → COMPLETED
```

### Chi tiết các trạng thái

| Trạng thái | Mô tả | Người thực hiện | Hành động tiếp theo |
|-----------|-------|----------------|-------------------|
| **SCHEDULED** | Trận đấu đã được lên lịch | BTC tạo lịch thi đấu | Phân công trọng tài |
| **PREPARING** | Đã có trọng tài, chờ danh sách đội | BTC phân công trọng tài → Đội nộp danh sách | Duyệt danh sách cả 2 đội |
| **READY** | Cả hai đội đã có danh sách được duyệt | BTC duyệt danh sách | Đánh dấu trận bắt đầu |
| **IN_PROGRESS** | Trận đấu đang diễn ra | BTC hoặc trọng tài | Đánh dấu kết thúc |
| **FINISHED** | Trận đấu kết thúc, chờ báo cáo | Trọng tài + Giám sát viên nộp báo cáo | Xem xét báo cáo |
| **REPORTED** | Đã có đủ báo cáo | BTC xem xét | Xác nhận hoàn thành |
| **COMPLETED** | Hoàn thành toàn bộ quy trình | - | Ghi nhận vào bảng xếp hạng |

## Cấu trúc Database

### Bảng `matches` - Các trường mới

```sql
-- Lifecycle status
status VARCHAR(20) DEFAULT 'SCHEDULED'
  CHECK (status IN ('SCHEDULED', 'PREPARING', 'READY', 'IN_PROGRESS', 'FINISHED', 'REPORTED', 'COMPLETED'))

-- Officials assignment
main_referee_id INT NULL,
assistant_referee_1_id INT NULL,
assistant_referee_2_id INT NULL,
fourth_official_id INT NULL,
supervisor_id INT NULL,

-- Lineup status
home_lineup_status VARCHAR(20) DEFAULT 'PENDING' CHECK (...),
away_lineup_status VARCHAR(20) DEFAULT 'PENDING' CHECK (...),

-- Report tracking
referee_report_submitted BIT DEFAULT 0,
supervisor_report_submitted BIT DEFAULT 0,

-- Timestamps
officials_assigned_at DATETIME NULL,
lineups_approved_at DATETIME NULL,
started_at DATETIME NULL,
finished_at DATETIME NULL,
reports_completed_at DATETIME NULL
```

### Bảng `supervisor_reports`

```sql
CREATE TABLE supervisor_reports (
  id INT IDENTITY(1,1) PRIMARY KEY,
  match_id INT NOT NULL,
  supervisor_id INT NOT NULL,
  
  -- Ratings (1-10 scale)
  organization_rating INT CHECK (organization_rating BETWEEN 1 AND 10),
  home_team_rating INT CHECK (home_team_rating BETWEEN 1 AND 10),
  away_team_rating INT CHECK (away_team_rating BETWEEN 1 AND 10),
  stadium_condition_rating INT CHECK (stadium_condition_rating BETWEEN 1 AND 10),
  security_rating INT CHECK (security_rating BETWEEN 1 AND 10),
  
  -- Incident reporting
  incident_report NVARCHAR(MAX),
  has_serious_violation BIT DEFAULT 0,
  send_to_disciplinary BIT DEFAULT 0,
  recommendations NVARCHAR(MAX),
  
  -- Review tracking
  reviewed_by INT,
  reviewed_at DATETIME,
  review_notes NVARCHAR(1000),
  
  submitted_at DATETIME DEFAULT GETDATE()
);
```

### Bảng `match_lineups`

```sql
CREATE TABLE match_lineups (
  id INT IDENTITY(1,1) PRIMARY KEY,
  match_id INT NOT NULL,
  team_id INT NOT NULL,
  team_type VARCHAR(10) CHECK (team_type IN ('home', 'away')),
  
  -- Lineup data (JSON array of player IDs)
  starting_lineup NVARCHAR(MAX),
  substitutes NVARCHAR(MAX),
  
  status VARCHAR(20) DEFAULT 'PENDING',
  submitted_at DATETIME DEFAULT GETDATE(),
  reviewed_by INT,
  reviewed_at DATETIME,
  rejection_reason NVARCHAR(500)
);
```

### Bảng `match_lifecycle_history`

Audit trail ghi lại mọi thay đổi trạng thái:

```sql
CREATE TABLE match_lifecycle_history (
  id INT IDENTITY(1,1) PRIMARY KEY,
  match_id INT NOT NULL,
  from_status VARCHAR(20),
  to_status VARCHAR(20) NOT NULL,
  changed_by INT,
  change_note NVARCHAR(500),
  changed_at DATETIME DEFAULT GETDATE()
);
```

## API Endpoints

### 1. Quản lý trạng thái trận đấu

#### GET `/api/matches/:matchId/details`
Lấy thông tin chi tiết trận đấu với lifecycle info.

**Response:**
```json
{
  "match_id": 1,
  "home_team_name": "Manchester United",
  "away_team_name": "Liverpool",
  "status": "PREPARING",
  "main_referee_name": "Nguyễn Văn A",
  "supervisor_name": "Trần Văn B",
  "home_lineup_status": "SUBMITTED",
  "away_lineup_status": "APPROVED",
  "referee_report_submitted": false,
  "supervisor_report_submitted": false
}
```

#### POST `/api/matches/:matchId/change-status`
Thay đổi trạng thái trận đấu (one-stop API).

**Body:**
```json
{
  "status": "IN_PROGRESS",
  "note": "Trận đấu bắt đầu"
}
```

**Validation:** Chỉ cho phép chuyển trạng thái hợp lệ theo state machine.

### 2. Phân công trọng tài

#### POST `/api/matches/:matchId/assign-officials`
Phân công ban trọng tài (SCHEDULED → PREPARING).

**Permission:** `manage_matches`

**Body:**
```json
{
  "mainRefereeId": 5,
  "assistantReferee1Id": 6,
  "assistantReferee2Id": 7,
  "fourthOfficialId": 8,
  "supervisorId": 9
}
```

**Effect:**
- Cập nhật thông tin trọng tài
- Tự động chuyển trạng thái: SCHEDULED → PREPARING
- Gửi thông báo cho trọng tài và giám sát viên
- Gửi thông báo cho cả hai đội: "Hãy nộp danh sách cầu thủ"

### 3. Quản lý danh sách cầu thủ

#### POST `/api/matches/:matchId/submit-lineup`
Đội nộp danh sách cầu thủ.

**Body:**
```json
{
  "teamType": "home",
  "startingLineup": [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111],
  "substitutes": [112, 113, 114, 115, 116]
}
```

**Validation:**
- Đúng 11 cầu thủ chính thức
- 1-5 cầu thủ dự bị
- Tối đa 5 ngoại binh trong 11 chính thức
- Không có cầu thủ bị treo giò
- Không trùng lặp

#### POST `/api/matches/:matchId/lineup-status`
BTC duyệt/từ chối danh sách.

**Permission:** `manage_matches`

**Body:**
```json
{
  "teamType": "home",
  "status": "APPROVED"
}
```

**Effect:**
- Nếu cả hai đội đều APPROVED → Tự động chuyển: PREPARING → READY
- Gửi thông báo cho đội về kết quả duyệt

### 4. Báo cáo giám sát

#### POST `/api/matches/:matchId/supervisor-report`
Giám sát viên nộp báo cáo.

**Permission:** `manage_matches` hoặc `official_role`

**Body:**
```json
{
  "organizationRating": 8,
  "homeTeamRating": 7,
  "awayTeamRating": 8,
  "stadiumConditionRating": 9,
  "securityRating": 8,
  "incidentReport": "Có một số cổ động viên ném pháo sáng",
  "hasSeriousViolation": true,
  "sendToDisciplinary": true,
  "recommendations": "Tăng cường an ninh"
}
```

**Effect:**
- Lưu báo cáo vào `supervisor_reports`
- Đánh dấu `supervisor_report_submitted = 1`
- Nếu `sendToDisciplinary = true` → Gửi thông báo cho Ban Kỷ luật
- Nếu cả referee và supervisor đều đã báo cáo → FINISHED → REPORTED

#### GET `/api/matches/:matchId/supervisor-report`
Xem báo cáo giám sát.

#### GET `/api/supervisor/my-reports?seasonId=1`
Giám sát viên xem các báo cáo của mình.

#### GET `/api/admin/supervisor-reports/disciplinary?seasonId=1`
BTC xem các báo cáo có vi phạm nghiêm trọng.

**Permission:** `manage_matches` hoặc `manage_discipline`

### 5. Thống kê

#### GET `/api/seasons/:seasonId/matches/by-status?status=PREPARING`
Lấy danh sách trận đấu theo trạng thái.

#### GET `/api/seasons/:seasonId/matches/lifecycle-statistics`
Thống kê trạng thái của tất cả trận đấu.

**Response:**
```json
{
  "SCHEDULED": 5,
  "PREPARING": 8,
  "READY": 3,
  "IN_PROGRESS": 1,
  "FINISHED": 2,
  "REPORTED": 1,
  "COMPLETED": 15
}
```

#### GET `/api/seasons/:seasonId/supervisor-reports/statistics`
Thống kê báo cáo giám sát.

**Response:**
```json
{
  "totalReports": 20,
  "averageOrganizationRating": 8.5,
  "incidentsCount": 3,
  "seriousViolations": 1,
  "sentToDisciplinary": 1
}
```

## Services

### matchLifecycleService.ts

**Các method chính:**

```typescript
// Change match status with validation
changeMatchStatus(matchId, newStatus, userId, note?): Promise<void>

// Assign officials (SCHEDULED → PREPARING)
assignOfficials(matchId, officials, userId): Promise<void>

// Update lineup status (auto-transition to READY if both approved)
updateLineupStatus(matchId, teamType, status, userId): Promise<void>

// Mark reports submitted (auto-transition to REPORTED)
markRefereeReportSubmitted(matchId): Promise<void>
markSupervisorReportSubmitted(matchId): Promise<void>

// Statistics
getMatchesByStatus(seasonId, status): Promise<Match[]>
getLifecycleStatistics(seasonId): Promise<StatusCount>
```

**State machine validation:**

```typescript
const VALID_TRANSITIONS = {
  SCHEDULED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'SCHEDULED'],
  READY: ['IN_PROGRESS', 'PREPARING'],
  IN_PROGRESS: ['FINISHED', 'PAUSED'],
  FINISHED: ['REPORTED'],
  REPORTED: ['COMPLETED', 'FINISHED'],
  COMPLETED: []
};
```

### supervisorReportService.ts

**Các method chính:**

```typescript
// Create supervisor report
createSupervisorReport(matchId, supervisorId, reportData): Promise<Report>

// Get report for a match
getSupervisorReport(matchId): Promise<Report | null>

// Get supervisor's reports
getMySupervisorReports(supervisorId, seasonId?): Promise<Report[]>

// Get reports flagged for disciplinary review
getReportsForDisciplinaryReview(seasonId?): Promise<Report[]>

// Admin review report
reviewSupervisorReport(reportId, reviewerId, notes?): Promise<void>

// Statistics
getSupervisorReportStatistics(seasonId): Promise<Statistics>
```

## Frontend Components

### 1. MatchLifecycleManager.jsx (Admin)

**Chức năng:**
- Xem thống kê trạng thái trận đấu
- Filter trận đấu theo trạng thái
- Phân công trọng tài (modal form)
- Duyệt/từ chối danh sách đội
- Xem thông tin chi tiết trận đấu

**Props:** `{ seasonId }`

**Usage:**
```jsx
import MatchLifecycleManager from '../components/MatchLifecycleManager';

<MatchLifecycleManager seasonId={1} />
```

### 2. TeamMatchLineup.jsx (Team Admin)

**Chức năng:**
- Xem trận đấu cần nộp danh sách
- Nộp danh sách (11 chính + 1-5 dự bị)
- Validation: foreign player limit, no duplicates
- Xem trạng thái duyệt (PENDING/SUBMITTED/APPROVED/REJECTED)
- Nộp lại nếu bị từ chối

**Props:** `{ seasonId }`

**State:**
```jsx
{
  startingPlayers: [playerId1, playerId2, ...], // length = 11
  substitutes: [playerId13, playerId14, ...] // length 1-5
}
```

### 3. SupervisorReportForm.jsx (Supervisor)

**Chức năng:**
- Xem trận đấu cần báo cáo (FINISHED status)
- Nộp báo cáo với ratings (1-10)
- Báo cáo sự cố
- Gắn cờ vi phạm nghiêm trọng
- Gửi lên Ban Kỷ luật nếu cần
- Xem các báo cáo đã nộp

**Props:** `{ seasonId }`

### 4. MatchLifecycleWorkflowPage.jsx (Admin Page)

Trang tổng hợp:
- Season selector
- Workflow diagram
- Hướng dẫn chi tiết 7 bước
- Embedded MatchLifecycleManager

## Notification System

### Các sự kiện trigger notification

| Sự kiện | Người nhận | Nội dung |
|---------|-----------|----------|
| Officials assigned | Trọng tài + Giám sát + Cả 2 đội | "Bạn được phân công / Hãy nộp danh sách" |
| Lineup approved | Đội | "Danh sách đã được duyệt" |
| Lineup rejected | Đội | "Danh sách bị từ chối: [lý do]" |
| Both lineups approved | Trọng tài + Giám sát + Cả 2 đội | "Trận đấu sẵn sàng" |
| Match finished | Trọng tài + Giám sát | "Hãy nộp báo cáo" |
| Serious violation flagged | Ban Kỷ luật | "Có vi phạm nghiêm trọng cần xem xét" |

### Implementation

```typescript
// In matchLifecycleService
private async triggerNotification(match, eventType) {
  const notificationMap = {
    OFFICIALS_ASSIGNED: {
      recipients: [
        match.main_referee_id,
        match.supervisor_id,
        match.home_team_id,
        match.away_team_id
      ],
      message: "Trận đấu có cập nhật mới"
    },
    // ...
  };
  
  await notificationService.createNotification(notificationMap[eventType]);
}
```

## Validation Rules

### Lineup Validation

1. **Số lượng cầu thủ:**
   - Chính thức: đúng 11
   - Dự bị: 1-5

2. **Ngoại binh:**
   - Tối đa 5 ngoại binh trong 11 chính thức
   - Không giới hạn ở dự bị

3. **Cầu thủ bị treo giò:**
   - Không được có trong danh sách (cả chính + dự bị)

4. **Trùng lặp:**
   - Mỗi cầu thủ chỉ được chọn 1 lần

### Supervisor Report Validation

1. **Ratings:**
   - Phải trong khoảng 1-10
   - Bắt buộc có: organization_rating, home_team_rating, away_team_rating

2. **Serious violation:**
   - Nếu `has_serious_violation = true` → Bắt buộc có `incident_report`
   - `send_to_disciplinary` chỉ được chọn nếu `has_serious_violation = true`

## Integration Testing

### Test case 1: Happy path - Full workflow

```
1. Create match (status: SCHEDULED)
2. Assign officials → status: PREPARING
3. Home team submits lineup → home_lineup_status: SUBMITTED
4. Admin approves home lineup → home_lineup_status: APPROVED
5. Away team submits lineup → away_lineup_status: SUBMITTED
6. Admin approves away lineup → away_lineup_status: APPROVED, status: READY
7. Start match → status: IN_PROGRESS
8. Finish match → status: FINISHED
9. Referee submits report → referee_report_submitted: true
10. Supervisor submits report → supervisor_report_submitted: true, status: REPORTED
11. Admin confirms completion → status: COMPLETED
```

### Test case 2: Lineup rejection

```
1. Team submits lineup with 12 starting players → Error: "Must have exactly 11"
2. Team submits lineup with 6 foreign players → Error: "Max 5 foreign players"
3. Team submits valid lineup → Success
4. Admin rejects lineup → status: REJECTED
5. Team resubmits corrected lineup → Success
```

### Test case 3: Disciplinary flag

```
1. Match finishes (status: FINISHED)
2. Supervisor submits report with serious violation
3. System sends notification to disciplinary committee
4. Admin reviews report in disciplinary panel
```

## Migration & Deployment

### 1. Run migration

```bash
cd backend
npm run migrate:up
```

Migration file: `003_match_lifecycle_workflow.sql`

### 2. Update routes

File đã cập nhật:
- `backend/src/app.ts` - Import và mount matchLifecycleRoutes

### 3. Frontend integration

Các component đã tạo:
- `src/apps/admin/components/MatchLifecycleManager.jsx`
- `src/apps/admin/components/TeamMatchLineup.jsx`
- `src/apps/admin/components/SupervisorReportForm.jsx`
- `src/apps/admin/pages/MatchLifecycleWorkflowPage.jsx`

Thêm route vào admin app:
```jsx
// In src/apps/admin/App.jsx or router config
<Route path="/matches/lifecycle" element={<MatchLifecycleWorkflowPage />} />
```

## Best Practices

### 1. State Machine Pattern

✅ **DO:**
- Luôn validate transitions trước khi thay đổi trạng thái
- Ghi audit trail cho mọi thay đổi
- Trigger notifications tự động

❌ **DON'T:**
- Không cho phép thay đổi trạng thái tùy ý
- Không bỏ qua validation rules
- Không hardcode status trong code

### 2. Notification System

✅ **DO:**
- Gửi notification ngay sau khi thay đổi trạng thái
- Notification phải rõ ràng, có action button
- Log notification failures

❌ **DON'T:**
- Không spam notification
- Không gửi notification cho người không liên quan

### 3. Frontend UX

✅ **DO:**
- Hiển thị workflow diagram để user hiểu quy trình
- Show real-time statistics
- Disable buttons khi action không hợp lệ
- Confirm trước khi approve/reject

❌ **DON'T:**
- Không ẩn thông tin quan trọng
- Không để user thực hiện action không hợp lệ

## Troubleshooting

### Issue: Trận đấu không tự động chuyển sang READY

**Nguyên nhân:** Một trong hai đội chưa có danh sách APPROVED.

**Giải pháp:**
```sql
SELECT home_lineup_status, away_lineup_status 
FROM matches 
WHERE match_id = ?
```

Kiểm tra cả hai status phải là 'APPROVED'.

### Issue: Không gửi được notification

**Nguyên nhân:** notificationService chưa được config đúng.

**Giải pháp:**
- Check `notificationService.createNotification()` có hoạt động không
- Check user có `notification_enabled = 1` không
- Check connection tới notification queue

### Issue: Supervisor report validation failed

**Nguyên nhân:** Ratings không hợp lệ hoặc thiếu incident_report khi có serious violation.

**Giải pháp:**
```typescript
// Check validation in supervisorReportService
if (reportData.has_serious_violation && !reportData.incident_report) {
  throw new Error("Incident report is required for serious violations");
}
```

## Future Enhancements

### Phase 2 Features

1. **Referee Report Integration**
   - Tích hợp form báo cáo của trọng tài
   - Ghi nhận thẻ vàng/đỏ, phạt đền
   - Auto-update discipline records

2. **Live Match Updates**
   - WebSocket cho real-time score updates
   - Live commentary
   - Minute-by-minute events

3. **Advanced Analytics**
   - Match performance metrics
   - Referee consistency analysis
   - Team behavior trends

4. **Mobile App**
   - Push notifications
   - Quick lineup submission
   - Live match tracking

## Contact & Support

For issues or questions:
- Technical issues: Create GitHub issue
- Business logic questions: Contact BTC admin
- Documentation updates: Submit PR

---

**Document version:** 1.0  
**Last updated:** 2024  
**Authors:** Development Team
