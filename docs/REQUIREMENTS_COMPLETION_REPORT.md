# BÁO CÁO KIỂM TRA HOÀN THIỆN CHỨC NĂNG
## Hệ thống Quản lý Giải Vô địch Bóng đá Quốc gia

**Ngày kiểm tra:** $(date)  
**Phiên bản hệ thống:** 1.0

---

## TÓM TẮT TỔNG QUAN

Hệ thống đã được phát triển khá đầy đủ với phần lớn các chức năng cốt lõi đã được triển khai. Tuy nhiên, vẫn còn một số chức năng chưa hoàn thiện và một số điểm cần điều chỉnh để đáp ứng đúng yêu cầu.

**Tỷ lệ hoàn thiện ước tính: ~85%**

---

## 1. QUẢN LÝ ĐỘI BÓNG THAM GIA

### ✅ 1.1. Mời đội tham gia giải
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN** (có một số điểm cần điều chỉnh)

**Chi tiết:**
- ✅ Hệ thống có chức năng tạo lời mời cho các đội (`seasonInvitationService.ts`)
- ✅ Có quản lý trạng thái mời: pending, accepted, rejected, expired
- ✅ Có deadline 2 tuần để phản hồi
- ⚠️ **VẤN ĐỀ:** Code hiện tại lấy TOP 14 đội từ mùa trước, nhưng yêu cầu là **8 đội**. Cần sửa trong `createSeasonInvitations()` function (line 63)
- ✅ Hỗ trợ 2 đội thăng hạng từ giải hạng dưới

**File liên quan:**
- `backend/src/services/seasonInvitationService.ts`
- `backend/src/routes/seasonInvitationRoutes.ts`
- `src/apps/admin/pages/InvitationsPage.jsx`

---

### ⚠️ 1.2. Tự động gửi giấy mời cho đội khác khi có đội từ chối
**Trạng thái:** ⚠️ **CHƯA HOÀN THIỆN**

**Chi tiết:**
- ❌ Không có logic tự động tìm và gửi giấy mời cho đội khác khi có đội từ chối hoặc hết hạn
- ❌ Không có endpoint/function để xử lý việc này
- ✅ Có tracking trạng thái rejected/expired
- 💡 **Đề xuất:** Cần thêm function để:
  1. Theo dõi số lượng đội đã chấp nhận
  2. Khi số lượng < 10, tự động chọn đội khác từ danh sách backup
  3. Gửi giấy mời cho các đội backup

**File cần chỉnh sửa:**
- `backend/src/services/seasonInvitationService.ts` - Thêm function `sendReplacementInvitations()`

---

### ✅ 1.3. Quản lý phản hồi từ đội bóng
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Có endpoint để chấp nhận/thừ chối lời mời
- ✅ Có lưu trữ ghi chú khi phản hồi
- ✅ Có tracking thời gian phản hồi
- ✅ Có function để đánh dấu invitation hết hạn

---

## 2. YÊU CẦU VỀ ĐỘI BÓNG

### ✅ 2.1. Lệ phí tham gia (1 tỷ VND)
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Có service quản lý lệ phí tham gia (`participationFeeService.ts`)
- ✅ Có tracking trạng thái đã thanh toán/chưa thanh toán
- ✅ Có validation để kiểm tra đội đã đóng lệ phí chưa trước khi tham gia
- ✅ Có thống kê về tình hình thanh toán

**File liên quan:**
- `backend/src/services/participationFeeService.ts`
- `backend/src/routes/participationFeeRoutes.ts`

---

### ⚠️ 2.2. Công ty/Cơ quan chủ quản phải ở Việt Nam
**Trạng thái:** ⚠️ **CHƯA CÓ VALIDATION**

**Chi tiết:**
- ✅ Có field `governing_body` trong database (bảng `teams`, `season_team_registrations`)
- ❌ **KHÔNG CÓ validation** để đảm bảo công ty chủ quản phải ở Việt Nam
- ❌ Không có field để lưu địa chỉ/trụ sở của công ty chủ quản
- 💡 **Đề xuất:** 
  - Thêm validation trong registration process
  - Thêm field `governing_body_country` hoặc `governing_body_address`
  - Validate country = "Vietnam" hoặc "Việt Nam"

**File cần chỉnh sửa:**
- `backend/src/services/seasonService.ts` hoặc service xử lý team registration
- Database schema: Thêm field cho địa chỉ công ty chủ quản

---

### ✅ 2.3. Số lượng cầu thủ (16-22)
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Database constraint: `CONSTRAINT CK_season_team_reg_squad CHECK (squad_size BETWEEN 16 AND 22)`
- ✅ Service validation trong `seasonPlayerRegistrationService.ts` (line 445-455)
- ✅ Kiểm tra max 22 cầu thủ đã được approve

**File liên quan:**
- `backend/src/data/migrations/20250205_full_system_schema.sql` (line 399)
- `backend/src/services/seasonPlayerRegistrationService.ts`

---

### ✅ 2.4. Cầu thủ ngoại (Tối đa 5 đăng ký, 3 thi đấu)
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Database constraint: `CONSTRAINT CK_season_team_reg_foreign CHECK (foreign_player_count BETWEEN 0 AND 5)`
- ✅ Validation tối đa 5 cầu thủ ngoại khi đăng ký (trong `seasonPlayerRegistrationService.ts`, line 470)
- ✅ Validation tối đa 3 cầu thủ ngoại khi thi đấu (trong `lineupValidationService.ts`, line 37-41)
- ✅ Service để đếm số cầu thủ ngoại trong đội hình

**File liên quan:**
- `backend/src/services/lineupValidationService.ts`
- `backend/src/services/seasonPlayerRegistrationService.ts`
- `backend/src/routes/lineupValidationRoutes.ts`

---

### ✅ 2.5. Độ tuổi tối thiểu (16 tuổi)
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Database constraint: `CHECK (age_on_season_start BETWEEN 16 AND 40)`
- ✅ Service validation trong `seasonPlayerRegistrationService.ts` (line 430-431)
- ✅ Kiểm tra tuổi tại thời điểm bắt đầu mùa giải

**File liên quan:**
- `backend/src/services/seasonPlayerRegistrationService.ts`
- `backend/src/services/rulesetService.ts` (có min_age trong ruleset)

---

### ✅ 2.6. Sân nhà (Tối thiểu 10,000 chỗ, ít nhất 2 sao)
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Database constraint: `CONSTRAINT CK_season_team_reg_capacity CHECK (home_stadium_capacity >= 10000)`
- ✅ Database constraint: `CONSTRAINT CK_season_team_reg_rating CHECK (home_stadium_rating >= 2)`
- ✅ Có service quản lý stadium (`stadiumService.ts`)
- ✅ Có validation trong registration process

**File liên quan:**
- `backend/src/data/migrations/20250205_full_system_schema.sql` (line 397-398)
- `backend/src/services/stadiumService.ts`
- `backend/src/routes/stadiumRoutes.ts`

---

### ⚠️ 2.7. Lịch thi đấu của các giải khác
**Trạng thái:** ❌ **CHƯA CÓ**

**Chi tiết:**
- ❌ Không có bảng/field để lưu thông tin về các giải khác mà đội tham gia
- ❌ Không có chức năng quản lý conflict lịch thi đấu
- 💡 **Đề xuất:** 
  - Thêm bảng `team_external_schedules` hoặc field trong `season_team_registrations`
  - Cho phép đội upload/submit lịch thi đấu các giải khác
  - BTC có thể xem và xem xét khi sắp lịch

**File cần tạo mới:**
- Migration: Tạo bảng `team_external_schedules`
- Service: `externalScheduleService.ts`
- Routes: `externalScheduleRoutes.ts`

---

## 3. THÔNG TIN ĐỘI BÓNG VÀ CẦU THỦ

### ✅ 3.1. Thông tin đội bóng
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Có đầy đủ field: tên đội, cơ quan chủ quản, thành phố, sân nhà
- ✅ Có quản lý quần áo đăng ký thi đấu (bảng `team_kits`)
- ✅ Có field để tự giới thiệu đội (description/biography)

**File liên quan:**
- `backend/src/services/teamService.ts`
- `backend/src/data/migrations/20250205_full_system_schema.sql`

---

### ✅ 3.2. Danh sách cầu thủ
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Có đầy đủ thông tin: tên, năm sinh, nơi sinh, quốc tịch, vị trí
- ✅ Có lưu tiểu sử chơi bóng (biography)
- ✅ Có thông tin chiều cao, cân nặng (height_cm, weight_kg)
- ✅ Có hệ thống đăng ký và phê duyệt cầu thủ

**File liên quan:**
- `backend/src/services/seasonPlayerRegistrationService.ts`
- `backend/src/services/playerService.ts`
- `backend/src/routes/seasonPlayerRoutes.ts`

---

## 4. LỊCH THI ĐẤU

### ✅ 4.1. Tạo lịch thi đấu (18 lượt, mỗi lượt 5 trận)
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Service tạo lịch round-robin (`scheduleService.ts`)
- ✅ Tạo đúng 18 lượt đấu
- ✅ Đảm bảo mỗi đội thi đấu 18 trận (9 sân nhà, 9 sân khách)
- ✅ Mỗi lượt có 5 trận đấu
- ✅ Lưu thông tin: ngày giờ, 2 đội thi đấu, sân thi đấu

**File liên quan:**
- `backend/src/services/scheduleService.ts`
- `backend/src/routes/scheduleRoutes.ts`
- `src/apps/admin/pages/ScheduleManagement.jsx`

---

### ✅ 4.2. Công bố lịch thi đấu
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Có API để lấy lịch thi đấu
- ✅ Có frontend để hiển thị lịch thi đấu (public portal)
- ✅ Có gửi lịch đến các đội tham dự

---

## 5. QUẢN LÝ TRẬN ĐẤU

### ✅ 5.1. Trọng tài và Giám sát viên
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Service quản lý trọng tài (`matchOfficialService.ts`, `officialService.ts`)
- ✅ Có các role: referee, assistant_referee, fourth_official, video_assistant_referee, match_commissioner, supervisor
- ✅ Có assignment trọng tài cho trận đấu
- ✅ Có xác nhận assignment
- ✅ Có kiểm tra conflict lịch

**File liên quan:**
- `backend/src/services/matchOfficialService.ts`
- `backend/src/services/officialService.ts`
- `backend/src/routes/matchOfficialRoutes.ts`
- `src/apps/admin/pages/OfficialsManagement.jsx`

---

### ✅ 5.2. Báo cáo trận đấu
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Service báo cáo trận đấu (`matchReportService.ts`)
- ✅ Trọng tài bàn có thể báo cáo: tỷ số, cầu thủ xuất sắc, cầu thủ ghi bàn, thẻ phạt
- ✅ Giám sát viên có thể báo cáo: đánh giá công tác tổ chức, sai sót, ghi chú
- ✅ Có lưu trữ thông tin chi tiết

**File liên quan:**
- `backend/src/services/matchReportService.ts`
- `backend/src/routes/matchReportRoutes.ts`

---

### ✅ 5.3. Đăng ký cầu thủ thi đấu (16 cầu thủ: 11 chính thức + 5 dự bị)
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Service quản lý đội hình (`matchLineupService.ts`)
- ✅ Có validation đội hình (lineupValidationService)
- ✅ Có validation cầu thủ ngoại (max 3)
- ✅ Có validation cầu thủ bị treo giò
- ✅ Có lưu quần áo thi đấu (chính thức/dự bị)
- ✅ Có lưu đội hình (4-4-2, 4-3-3, etc.)

**File liên quan:**
- `backend/src/services/matchLineupService.ts`
- `backend/src/services/lineupValidationService.ts`
- `backend/src/routes/lineupValidationRoutes.ts`

---

## 6. TÍNH ĐIỂM VÀ XẾP HẠNG

### ✅ 6.1. Tính điểm (Thắng: 3, Hòa: 1, Thua: 0)
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Service tính điểm và xếp hạng (`standingsService_v2.ts`)
- ✅ Có bảng xếp hạng với đầy đủ thông tin: Hạng, Tên đội, Số trận, Hiệu số bàn thắng bại, Điểm số
- ✅ Tính điểm đúng quy định: Thắng 3, Hòa 1, Thua 0

**File liên quan:**
- `backend/src/services/standingsService_v2.ts`
- `backend/src/routes/adminStandingsRoutes.ts`
- `src/apps/admin/pages/StandingsManagement.jsx`

---

### ✅ 6.2. Quy tắc xếp hạng (điểm → hiệu số → tỷ số đối đầu → rút thăm)
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN** (có 2 chế độ)

**Chi tiết:**
- ✅ Có 2 chế độ:
  - **LIVE mode:** Chỉ xét điểm và hiệu số (chấp nhận cùng hạng)
  - **FINAL mode:** Áp dụng đầy đủ quy tắc (điểm → hiệu số → tỷ số đối đầu → bốc thăm)
- ✅ Service hỗ trợ head-to-head tie-break
- ✅ Đúng với yêu cầu: trong mùa giải chỉ xét 2 điều kiện đầu, cuối mùa xét đầy đủ

**File liên quan:**
- `backend/src/services/standingsService_v2.ts` (line 44-74, 155-206)
- `backend/src/services/scheduleService.ts` (có function `calculateTiebreaker`)

---

## 7. QUẢN LÝ KỶ LUẬT

### ✅ 7.1. Thẻ vàng và Thẻ đỏ
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Service quản lý kỷ luật (`disciplinaryService.ts`)
- ✅ Có lưu trữ thẻ vàng/thẻ đỏ từ match events
- ✅ Có thống kê thẻ phạt theo cầu thủ
- ✅ Có danh sách cầu thủ bị thẻ

**File liên quan:**
- `backend/src/services/disciplinaryService.ts`
- `backend/src/routes/disciplineRoutes.ts`
- `src/apps/admin/pages/SeasonDisciplinePage.jsx`

---

### ✅ 7.2. Cầu thủ bị treo giò (2 thẻ vàng / 1 thẻ đỏ)
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Service tự động tính suspension (`disciplinaryService.ts`)
- ✅ Có function `recalculateDisciplinaryForSeason()` để tính lại suspension
- ✅ Có kiểm tra cầu thủ bị treo giò trước trận đấu
- ✅ Có lưu thông tin suspension: lý do, số trận cấm, trận bắt đầu cấm

**File liên quan:**
- `backend/src/services/disciplinaryService.ts` (line 224-380)
- `backend/src/services/lineupValidationService.ts` (có check suspended players)

---

## 8. DANH SÁCH THỐNG KÊ

### ✅ 8.1. Vua phá lưới
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Service trao giải (`awardService.ts`)
- ✅ Function `getTopScorers()` để lấy danh sách cầu thủ ghi bàn nhiều nhất
- ✅ Tính dựa trên GOAL events trong match_events
- ✅ Có ranking và thống kê

**File liên quan:**
- `backend/src/services/awardService.ts`
- `backend/src/routes/awardsRoutes.ts`
- `src/apps/admin/pages/SeasonAwardsPage.jsx`

---

### ✅ 8.2. Cầu thủ xuất sắc nhất
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Function `getTopMVPs()` để lấy danh sách cầu thủ được bầu xuất sắc nhiều nhất
- ✅ Tính dựa trên `player_of_match` flag trong `player_match_stats`
- ✅ Có thống kê số lần được bầu

**File liên quan:**
- `backend/src/services/awardService.ts`
- `backend/src/services/playerOfMatchService.ts`

---

### ✅ 8.3. Danh sách thẻ phạt
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Function `getCardSummary()` để lấy danh sách cầu thủ bị thẻ
- ✅ Phân loại thẻ vàng và thẻ đỏ
- ✅ Có hiển thị trong Discipline page

**File liên quan:**
- `backend/src/services/disciplinaryService.ts`
- `src/apps/admin/pages/SeasonDisciplinePage.jsx`

---

## 9. TRAO GIẢI CUỐI MÙA GIẢI

### ⚠️ 9.1. Trao giải cho đội bóng và cầu thủ
**Trạng thái:** ⚠️ **CÓ DỮ LIỆU NHƯNG CHƯA CÓ QUY TRÌNH TRAO GIẢI**

**Chi tiết:**
- ✅ Có dữ liệu về bảng xếp hạng cuối mùa (FINAL mode)
- ✅ Có dữ liệu về Vua phá lưới
- ✅ Có dữ liệu về Cầu thủ xuất sắc
- ⚠️ **CHƯA CÓ:**
  - Quy trình chính thức để "trao giải"
  - Lưu trữ thông tin trao giải (ngày trao, người trao, ảnh/video)
  - Workflow để đánh dấu giải đã được trao
  - Notification về trao giải

**File cần bổ sung:**
- Có thể thêm bảng `season_awards_ceremony` để lưu thông tin trao giải
- Hoặc thêm field `awarded_at`, `awarded_by` vào các bảng liên quan

---

## 10. QUY ĐỊNH GIẢI (RULESET)

### ✅ 10.1. Quản lý quy định giải
**Trạng thái:** ✅ **ĐÃ HOÀN THIỆN**

**Chi tiết:**
- ✅ Service quản lý ruleset (`rulesetService.ts`)
- ✅ Có lưu trữ các quy định: min_age, max_players, max_foreign_players, stadium requirements
- ✅ Có gán ruleset cho mùa giải
- ✅ Có audit log cho việc thay đổi quy định

**File liên quan:**
- `backend/src/services/rulesetService.ts`
- `backend/src/routes/rulesetRoutes.ts`
- `src/apps/admin/pages/RulesetManagement.jsx`

---

## TỔNG HỢP VẤN ĐỀ CẦN XỬ LÝ

### 🔴 Vấn đề Nghiêm trọng (Cần sửa ngay)

1. **Logic mời đội sai:** Code đang lấy TOP 14 đội thay vì TOP 8 đội từ mùa trước
   - File: `backend/src/services/seasonInvitationService.ts`, line 63
   - Cần sửa: `SELECT TOP 14` → `SELECT TOP 8`

### 🟡 Vấn đề Quan trọng (Nên có)

2. **Thiếu validation công ty chủ quản ở Việt Nam**
   - Cần thêm field và validation

3. **Thiếu logic tự động gửi giấy mời thay thế**
   - Khi có đội từ chối/hết hạn, cần tự động mời đội khác

4. **Thiếu quản lý lịch thi đấu giải khác**
   - Đội cần submit lịch thi đấu các giải khác
   - BTC cần xem để tránh conflict

5. **Thiếu quy trình trao giải chính thức**
   - Có dữ liệu nhưng chưa có workflow trao giải

---

## KHUYẾN NGHỊ ƯU TIÊN

### Ưu tiên 1 (Sửa ngay)
1. ✅ Sửa logic mời đội từ 14 → 8 đội

### Ưu tiên 2 (Quan trọng)
2. ✅ Thêm validation công ty chủ quản ở Việt Nam
3. ✅ Thêm logic tự động gửi giấy mời thay thế

### Ưu tiên 3 (Nên có)
4. ✅ Thêm quản lý lịch thi đấu giải khác
5. ✅ Thêm quy trình trao giải chính thức

---

## KẾT LUẬN

Hệ thống đã được phát triển khá đầy đủ với **~85% chức năng đã hoàn thiện**. Các chức năng cốt lõi như quản lý đội bóng, cầu thủ, lịch thi đấu, tính điểm xếp hạng, kỷ luật, và trao giải cơ bản đều đã có.

Tuy nhiên, còn một số điểm cần hoàn thiện để đáp ứng 100% yêu cầu, đặc biệt là:
- Sửa lỗi logic mời đội
- Thêm validation và quản lý một số yêu cầu phụ
- Hoàn thiện quy trình trao giải

Với những điều chỉnh nêu trên, hệ thống sẽ đáp ứng đầy đủ các yêu cầu của BTC giải vô địch bóng đá quốc gia.

