# Các Chức Năng Mới Được Thêm Vào - Báo Cáo Hoàn Thiện

## 1. Quản Lý Mời Đội (Season Invitations)

### Service: `seasonInvitationService.ts`
- **createSeasonInvitations()** - Tự động mời 14 đội từ mùa trước + 2 đội thăng hạp (deadline 2 tuần)
- **getSeasonInvitations()** - Xem tất cả lời mời cho một mùa giải
- **getPendingInvitationsForTeam()** - Lấy các lời mời đang chờ của đội
- **acceptInvitation()** / **rejectInvitation()** - Chấp nhận/từ chối lời mời
- **markExpiredInvitations()** - Đánh dấu các lời mời hết hạn
- **getInvitationsSummary()** - Thống kê trạng thái lời mời

### Routes: `/api/season-invitations`
- `GET /season/:seasonId` - Danh sách lời mời (Admin)
- `GET /team/:teamId` - Lời mời chờ của đội
- `GET /summary/:seasonId` - Tóm tắt lời mời
- `POST /send` - Gửi lời mời tự động
- `POST /:invitationId/accept|reject` - Phản hồi lời mời
- `POST /expire/check` - Kiểm tra lời mời hết hạn

---

## 2. Quản Lý Sân Vận Động (Stadiums)

### Service: `stadiumService.ts`
- **createStadium()** - Tạo sân mới
- **getActiveStadiums()** - Xem sân hoạt động
- **getAvailableStadiums()** - Xem sân trống vào ngày cụ thể
- **getStadiumsByCity()** / **getStadiumsByCountry()** - Lọc sân theo vị trí
- **updateStadium()** / **deleteStadium()** - Quản lý thông tin sân

### Routes: `/api/stadiums`
- `GET /` - Tất cả sân
- `GET /active` - Sân đang hoạt động
- `GET /available/:matchDate` - Sân trống
- `GET /city/:city` / `GET /country/:country` - Lọc theo vị trí
- `POST /` - Tạo sân (Admin)
- `PUT /:stadiumId` / `DELETE /:stadiumId` - Quản lý sân

---

## 3. Phân Công Trọng Tài (Match Official Assignments)

### Service: `matchOfficialService.ts`
- **assignOfficialToMatch()** - Phân công trọng tài vào trận
- **getMatchOfficials()** - Xem trọng tài của trận
- **getAvailableOfficials()** - Xem trọng tài trống
- **confirmAssignment()** - Xác nhận phân công
- **checkAvailability()** - Kiểm tra không trùng lịch
- **batchAssignOfficials()** - Phân công hàng loạt

### Routes: `/api/match-officials`
- `GET /match/:matchId` - Trọng tài của trận
- `GET /available/:matchId` - Trọng tài trống
- `POST /assign` - Phân công trọng tài
- `POST /batch-assign` - Phân công hàng loạt
- `POST /:assignmentId/confirm` - Xác nhận
- `PUT /:assignmentId/role` - Thay đổi vị trí

---

## 4. Báo Cáo Trận Đấu (Match Reports)

### Service: `matchReportService.ts`
- **createMatchReport()** - Tạo báo cáo trận
- **getMatchReport()** - Xem báo cáo trận
- **updateMatchReport()** - Cập nhật báo cáo
- **getSeasonIncidents()** - Lấy các sự cố trong mùa
- **getSeasonInjuries()** - Lấy danh sách chấn thương

### Routes: `/api/match-reports`
- `GET /:matchId` - Báo cáo trận đấu
- `POST /` - Gửi báo cáo (Trọng tài)
- `PUT /:reportId` - Cập nhật báo cáo
- `GET /season/:seasonId/incidents` - Danh sách sự cố
- `GET /season/:seasonId/injuries` - Danh sách chấn thương

---

## 5. Cầu Thủ Xuất Sắc Nhất (Player of Match)

### Service: `playerOfMatchService.ts`
- **selectPlayerOfMatch()** - Chọn cầu thủ xuất sắc nhất
- **getPlayerOfMatch()** - Xem cầu thủ của trận
- **getSeasonPlayerOfMatch()** - Danh sách cầu thủ xuất sắc trong mùa
- **getTopPlayersInSeason()** - Top cầu thủ đạt giải
- **getSeasonPomStatistics()** - Thống kê POM

### Routes: `/api/player-of-match`
- `GET /:matchId` - Cầu thủ xuất sắc của trận
- `GET /season/:seasonId` - Danh sách trong mùa
- `GET /season/:seasonId/top` - Top cầu thủ
- `POST /` - Chọn cầu thủ
- `GET /match/:matchId/voting-results` - Kết quả bình chọn

---

## 6. Validation Đội Hình (Lineup Validation)

### Service: `lineupValidationService.ts`
- **validateLineup()** - Kiểm tra đội hình (tối đa 3 cầu thủ ngoại)
- **getSuspendedPlayersForMatch()** - Danh sách cầu thủ bị treo giò
- **getForeignPlayerCount()** - Đếm cầu thủ ngoại

### Routes: `/api/lineup`
- `POST /validate` - Kiểm tra đội hình
- `GET /suspended/:matchId` - Cầu thủ bị treo giò
- `GET /foreign-count/:matchId/:teamId` - Đếm cầu thủ ngoại

---

## 7. Lịch Thi Đấu Round-Robin (Schedule)

### Service: `scheduleService.ts`
- **generateRoundRobinSchedule()** - Tạo lịch thi đấu tự động
  - 18 lượt cho 10 đội
  - 5 trận mỗi lượt
  - Tự động tính ngày thi đấu
- **getSchedule()** - Xem lịch toàn bộ
- **calculateTiebreaker()** - Tính tiêu chí phá vòng
  - Đối đầu trực tiếp
  - Hiệu số bàn
  - Bàn ghi được

### Routes: `/api/schedule`
- `POST /generate` - Tạo lịch thi đấu
- `GET /season/:seasonId` - Xem lịch
- `GET /season/:seasonId/round/:round` - Xem lượt
- `GET /tiebreaker/:seasonId` - Tính tiêu chí phá vòng

---

## 8. Quản Lý Phí Tham Dự (Participation Fees)

### Service: `participationFeeService.ts`
- **createParticipationFee()** - Tạo hóa đơn phí tham dự
- **markFeeAsPaid()** - Đánh dấu đã thanh toán
- **getUnpaidFees()** / **getOverdueFees()** - Danh sách nợ
- **canTeamParticipate()** - Kiểm tra đội có được tham dự không (buộc thanh toán)
- **getFeePaymentStatistics()** - Thống kê thanh toán

### Routes: `/api/participation-fees`
- `GET /season/:seasonId` - Danh sách phí
- `GET /season/:seasonId/overdue` - Phí quá hạn
- `POST /` - Tạo phí mới
- `POST /:feeId/mark-paid` - Đánh dấu thanh toán
- `GET /team/:teamId/season/:seasonId/can-participate` - Kiểm tra quyền tham dự

---

## 9. Thống Kê Cầu Thủ (Player Statistics Display)

### Service: `playerStatsDisplayService.ts`
- **getPlayerStatistics()** - Thống kê chi tiết cầu thủ
- **getPlayerPhysicalStats()** - Thông tin thể chất
  - Chiều cao, cân nặng
  - Tính BMI tự động
- **getTopScorers()** - Top vua phá lưới
- **getAssistsLeaders()** - Top người tơ máy
- **getPlayersByHeightRange()** / **getPlayersByWeightRange()** - Lọc theo thể chất
- **getTeamPhysicalAverages()** - Thống kê thể chất đội

### Routes: `/api/player-stats`
- `GET /season/:seasonId` - Thống kê toàn mùa
- `GET /season/:seasonId/player/:playerId` - Cầu thủ cụ thể
- `GET /player/:playerId/physical` - Thông tin thể chất
- `GET /season/:seasonId/top-scorers` - Top vua phá lưới
- `GET /height/:min/:max` / `GET /weight/:min/:max` - Lọc theo thể chất
- `GET /team/:teamId/physical-averages` - Thống kê đội

---

## 10. Quản Lý Thẻ Phạt & Treo Giò (Disciplinary) - Cải Thiện

File `disciplinaryService.ts` đã tồn tại, tôi đã cải thiện với:
- **getPlayerDisciplinaryStatus()** - Kiểm tra trạng thái cầu thủ
- **getSuspendedPlayersInSeason()** - Danh sách bị treo giò
- **getTeamDisciplinaryRecords()** - Thống kê đội
- **getPlayerDisciplinaryHistory()** - Lịch sử kỷ luật
- **getYellowCardStatistics()** - Thống kê thẻ vàng
- **getRedCardStatistics()** - Thống kê thẻ đỏ

---

## 11. Database Schema

File migration: `002_add_missing_features.sql`

Các table mới:
- ✅ `season_invitations` - Lời mời đội
- ✅ `stadiums` - Sân vận động
- ✅ `match_official_assignments` - Phân công trọng tài
- ✅ `match_reports` - Báo cáo trận đấu
- ✅ `player_of_match` - Cầu thủ xuất sắc nhất
- ✅ `player_of_match_votes` - Bình chọn cầu thủ
- ✅ `participation_fees` - Phí tham dự

Các cột bổ sung:
- ✅ `matches.stadium_id` - Sân vận động
- ✅ `matches.round` - Lượt thi đấu
- ✅ `players.is_foreign` - Cầu thủ ngoại
- ✅ `players.height_cm` - Chiều cao
- ✅ `players.weight_kg` - Cân nặng

---

## 12. Tích Hợp API

Tất cả routes đã được tích hợp vào `app.ts`:

```typescript
app.use("/api/season-invitations", seasonInvitationRoutes);
app.use("/api/stadiums", stadiumRoutes);
app.use("/api/match-officials", matchOfficialRoutes);
app.use("/api/match-reports", matchReportRoutes);
app.use("/api/player-of-match", playerOfMatchRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/participation-fees", participationFeeRoutes);
app.use("/api/player-stats", playerStatsDisplayRoutes);
app.use("/api/lineup", lineupValidationRoutes);
```

---

## 13. Cài Đặt & Sử Dụng

### Bước 1: Chạy Migration
```bash
cd backend
npm run build
node dist/src/db/migrations/002_add_missing_features.sql
```

### Bước 2: Kiểm Tra Database
Kết nối với SQL Server và chạy migration hoặc sử dụng tool quản lý DB.

### Bước 3: Khởi Động Server
```bash
npm run dev
```

### Bước 4: Kiểm Tra API Health
```
GET http://localhost:3000/health
```

---

## 14. Danh Sách Permissions Cần Cấp

Các permission mới cần thêm vào database:

```
- manage_season_invitations
- manage_stadiums
- manage_match_officials
- submit_match_reports
- manage_match_reports
- manage_player_of_match
- manage_schedule
- manage_payments
- view_season_statistics
```

---

## 15. Tóm Tắt

| Chức Năng | Status | Service | Routes | Database |
|-----------|--------|---------|--------|----------|
| Season Invitations | ✅ | seasonInvitationService | seasonInvitationRoutes | season_invitations |
| Stadiums | ✅ | stadiumService | stadiumRoutes | stadiums |
| Match Officials | ✅ | matchOfficialService | matchOfficialRoutes | match_official_assignments |
| Match Reports | ✅ | matchReportService | matchReportRoutes | match_reports |
| Player of Match | ✅ | playerOfMatchService | playerOfMatchRoutes | player_of_match |
| Lineup Validation | ✅ | lineupValidationService | lineupValidationRoutes | (existing) |
| Schedule (Round-Robin) | ✅ | scheduleService | scheduleRoutes | (existing + round column) |
| Participation Fees | ✅ | participationFeeService | participationFeeRoutes | participation_fees |
| Player Statistics | ✅ | playerStatsDisplayService | playerStatsDisplayRoutes | (existing + columns) |
| Disciplinary | ✅ Enhanced | disciplinaryService | (existing) | (existing) |

---

**Tất cả các chức năng đã được hoàn thành! 🎉**
