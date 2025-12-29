# Hệ Thống Quy Trình Đăng Ký Đội Tham Gia Season - Hướng Dẫn Sử Dụng

## 📋 Tổng Quan

Hệ thống mới áp dụng **State Machine Pattern** để quản lý toàn bộ quy trình đội tham gia mùa giải, từ gửi lời mời đến xếp lịch thi đấu. Hệ thống loại bỏ các logic hardcode và tự động hóa các thông báo.

## 🎯 Các Trạng Thái (States)

| Trạng thái | Mô tả | Người thực hiện |
|------------|-------|-----------------|
| `DRAFT_INVITE` | BTC tạo danh sách dự kiến, chưa gửi | BTC |
| `INVITED` | Đã gửi lời mời, đội chưa phản hồi | BTC → Đội |
| `ACCEPTED` | Đội đồng ý tham gia | Đội |
| `DECLINED` | Đội từ chối tham gia | Đội |
| `SUBMITTED` | Đội đã nộp hồ sơ (sân, áo, cầu thủ) | Đội → BTC |
| `REQUEST_CHANGE` | BTC yêu cầu bổ sung/sửa hồ sơ | BTC → Đội |
| `APPROVED` | BTC duyệt hồ sơ, đủ điều kiện tham gia | BTC |
| `REJECTED` | BTC từ chối hồ sơ, loại đội | BTC |

## 🔄 Quy Trình Workflow

```
┌─────────────┐
│ DRAFT_INVITE│ (1) BTC tạo danh sách Top 8 + 2 thăng hạng
└──────┬──────┘
       │ BTC bấm "Gửi lời mời"
       ▼
┌─────────────┐
│   INVITED   │ (2) Gửi thông báo + quy định cho đội
└──────┬──────┘     ⏱️ Hạn phản hồi: 2 tuần
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
  ┌─────────┐   ┌─────────┐   ┌─────────┐
  │ACCEPTED │   │DECLINED │   │ EXPIRED │
  └────┬────┘   └────┬────┘   └─────────┘
       │             │
       │             └─► Tìm đội thay thế
       │
       │ Đội điền form
       ▼
┌─────────────┐
│  SUBMITTED  │ (3) Đội nộp hồ sơ
└──────┬──────┘     📄 Sân, áo đấu, cầu thủ
       │
       │ BTC duyệt
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌────────────┐  ┌───────────────┐  ┌─────────┐
│  APPROVED  │  │REQUEST_CHANGE │  │REJECTED │
└────┬───────┘  └───────┬───────┘  └────┬────┘
     │                  │                │
     │                  └─► Đội sửa lại  └─► Loại, tìm thay thế
     │
     └─► Đủ 10 đội ──► Xếp lịch thi đấu
```

## 🚀 Hướng Dẫn Sử Dụng

### A. Dành cho BTC (Admin)

#### Bước 1: Tạo danh sách lời mời

1. Vào trang **Admin > Season Registration Workflow**
2. Chọn mùa giải cần quản lý
3. Hệ thống tự động tạo danh sách dự kiến:
   - Top 8 đội từ mùa trước
   - 2 đội thăng hạng từ hạng dưới
4. Trạng thái: `DRAFT_INVITE` (Chưa gửi)

#### Bước 2: Gửi lời mời

1. Bấm nút **"Gửi tất cả lời mời"**
2. Hệ thống tự động:
   - Chuyển trạng thái → `INVITED`
   - Gửi thông báo cho Team Admin của 10 đội
   - Kèm theo: Quy định tham gia, hạn phản hồi (2 tuần)

#### Bước 3: Theo dõi phản hồi

**Thống kê hiển thị:**
- Số đội đã chấp nhận (`ACCEPTED`)
- Số đội đã từ chối (`DECLINED`)
- Số đội chưa phản hồi (`INVITED`)

**Xử lý khi đội từ chối:**
1. Hệ thống tự động đề xuất danh sách đội dự bị
2. BTC chọn đội thay thế
3. Gửi lời mời mới với hạn ngắn hơn (7 ngày)

#### Bước 4: Duyệt hồ sơ

Khi đội nộp hồ sơ (`SUBMITTED`):

**Các tùy chọn:**

1. **Duyệt** → `APPROVED`
   - Hồ sơ đạt yêu cầu
   - Đội đủ điều kiện tham gia
   - Hệ thống đếm tiến độ đến 10 đội

2. **Yêu cầu sửa** → `REQUEST_CHANGE`
   - Nhập lý do cần bổ sung (VD: "Thiếu ảnh áo đấu")
   - Đội nhận thông báo và sửa lại
   - Đội nộp lại → `SUBMITTED`

3. **Từ chối** → `REJECTED`
   - Nhập lý do không đạt (VD: "Sân không đủ tiêu chuẩn")
   - Đội bị loại
   - BTC tìm đội thay thế

#### Bước 5: Xếp lịch

Khi đủ 10 đội `APPROVED`:
1. Hệ thống hiển thị: **✅ Sẵn sàng xếp lịch**
2. BTC vào phần **Schedule Management**
3. Chạy thuật toán Round Robin 2 lượt
4. Hệ thống tự động gửi thông báo lịch thi đấu cho tất cả đội

### B. Dành cho Team Admin

#### Bước 1: Nhận lời mời

1. Nhận thông báo: **"Lời mời tham gia Season 2024/2025"**
2. Vào trang **My Team > Season Registration**
3. Xem chi tiết:
   - Quy định tham gia
   - Hạn phản hồi
   - Yêu cầu cần nộp

#### Bước 2: Phản hồi lời mời

**Tùy chọn 1: Chấp nhận**
- Bấm nút **"Chấp nhận"**
- Trạng thái → `ACCEPTED`
- Hiển thị form nộp hồ sơ

**Tùy chọn 2: Từ chối**
- Bấm nút **"Từ chối"**
- Nhập lý do (tùy chọn)
- Trạng thái → `DECLINED`

#### Bước 3: Nộp hồ sơ

Điền thông tin:

**1. Thông tin sân:**
- Tên sân
- Sức chứa (tối thiểu: 10,000 chỗ)
- Rating (tối thiểu: 2⭐)
- Thành phố

**2. Thông tin áo đấu:**
- Áo nhà: Màu áo / quần / tất
- Áo sân khách: Màu áo / quần / tất
- Áo thứ 3 (tùy chọn)

**3. Thông tin cầu thủ:**
- Tổng số cầu thủ (16-22)
- Số ngoại binh (0-5)

Bấm **"Nộp hồ sơ"** → Trạng thái `SUBMITTED`

#### Bước 4: Theo dõi kết quả

**Kịch bản 1: Được duyệt** ✅
- Nhận thông báo: **"Hồ sơ đã được duyệt"**
- Chờ thông báo lịch thi đấu

**Kịch bản 2: Yêu cầu bổ sung** ⚠️
- Nhận thông báo: **"Cần bổ sung: [lý do]"**
- Sửa hồ sơ và nộp lại
- Trạng thái: `REQUEST_CHANGE` → `SUBMITTED`

**Kịch bản 3: Không duyệt** ❌
- Nhận thông báo: **"Không đủ điều kiện: [lý do]"**
- Không được tham gia mùa giải này

## 🔔 Hệ Thống Thông Báo Tự Động

| Trạng thái chuyển | Người nhận | Nội dung |
|-------------------|------------|----------|
| → `INVITED` | Team Admin | Lời mời + quy định + hạn phản hồi |
| → `ACCEPTED` | Team Admin | Hướng dẫn nộp hồ sơ |
| → `SUBMITTED` | BTC Admins | Có hồ sơ mới cần duyệt |
| → `REQUEST_CHANGE` | Team Admin | Lý do cần sửa + link chỉnh sửa |
| → `APPROVED` | Team Admin | Thông báo đã duyệt + chờ lịch |
| → `REJECTED` | Team Admin | Lý do không đạt |
| 10 đội APPROVED | All Teams | Lịch thi đấu đã được xếp |

## 🛠️ API Endpoints

### Admin Endpoints

```
GET    /api/seasons/:seasonId/registrations
       - Danh sách đăng ký của mùa giải

POST   /api/seasons/:seasonId/registrations/send-invitations
       - Gửi tất cả lời mời (DRAFT_INVITE → INVITED)

GET    /api/seasons/:seasonId/registrations/statistics
       - Thống kê trạng thái

POST   /api/registrations/:id/approve
       - Duyệt hồ sơ

POST   /api/registrations/:id/reject
       - Từ chối hồ sơ (body: { note })

POST   /api/registrations/:id/request-change
       - Yêu cầu sửa (body: { note })
```

### Team Endpoints

```
GET    /api/teams/:teamId/registrations
       - Danh sách đăng ký của đội

POST   /api/registrations/:id/accept
       - Chấp nhận lời mời

POST   /api/registrations/:id/decline
       - Từ chối lời mời (body: { note? })

POST   /api/registrations/:id/submit
       - Nộp hồ sơ (body: { submissionData })
```

### Universal Endpoint (One-Stop API)

```
POST   /api/registrations/:id/change-status
       Body: {
         status: "INVITED" | "ACCEPTED" | ... | "APPROVED",
         note?: string,
         submissionData?: object
       }
       - API đa năng cho mọi chuyển đổi trạng thái
```

## 📊 Database Schema

### Bảng: `season_team_registrations`

```sql
CREATE TABLE season_team_registrations (
  registration_id INT PRIMARY KEY,
  season_id INT NOT NULL,
  team_id INT NOT NULL,
  registration_status VARCHAR(32) NOT NULL, -- Các trạng thái workflow
  submission_data NVARCHAR(MAX) NULL,       -- JSON: sân, áo, cầu thủ
  reviewer_note NVARCHAR(MAX) NULL,         -- Ghi chú BTC
  submitted_at DATETIME2 NULL,
  reviewed_at DATETIME2 NULL,
  reviewed_by INT NULL,
  created_at DATETIME2 NOT NULL,
  updated_at DATETIME2 NOT NULL,
  
  CONSTRAINT CK_registration_status CHECK (
    registration_status IN (
      'DRAFT_INVITE', 'INVITED', 'ACCEPTED', 'DECLINED',
      'SUBMITTED', 'REQUEST_CHANGE', 'APPROVED', 'REJECTED'
    )
  )
);
```

### Bảng: `season_registration_status_history`

Lưu lịch sử thay đổi trạng thái cho audit trail.

## 🎨 Frontend Components

### Admin Components

1. **SeasonRegistrationWorkflowPage.jsx**
   - Page chính cho BTC
   - Hiển thị workflow diagram
   - Quản lý danh sách đăng ký

2. **TeamRegistrationWorkflow.jsx**
   - Component hiển thị danh sách đăng ký
   - Thống kê real-time
   - Actions: Duyệt / Từ chối / Yêu cầu sửa

### Team Components

3. **TeamSeasonRegistration.jsx**
   - View cho Team Admin
   - Chấp nhận / Từ chối lời mời
   - Form nộp hồ sơ
   - Theo dõi trạng thái

## 🔐 Permissions

| Action | Required Permission |
|--------|---------------------|
| Xem danh sách đăng ký (Admin) | `manage_seasons` |
| Gửi lời mời | `manage_seasons` |
| Duyệt / Từ chối hồ sơ | `manage_seasons` |
| Chấp nhận / Từ chối lời mời | `manage_teams` hoặc `manage_own_team` |
| Nộp hồ sơ | `manage_teams` hoặc `manage_own_team` |

## 🧪 Testing Checklist

### Backend Testing

```bash
# Run migration
npm run migrate

# Test API endpoints
curl -X GET http://localhost:5000/api/seasons/1/registrations
curl -X POST http://localhost:5000/api/registrations/1/change-status \
  -H "Content-Type: application/json" \
  -d '{"status": "INVITED"}'
```

### Frontend Testing

1. ✅ BTC tạo danh sách draft
2. ✅ BTC gửi lời mời → Team nhận thông báo
3. ✅ Team chấp nhận → Hiển thị form
4. ✅ Team nộp hồ sơ → BTC nhận thông báo
5. ✅ BTC duyệt → Team nhận thông báo
6. ✅ Đủ 10 đội → Hiển thị "Ready for scheduling"

## 📝 Migration Guide

### Từ hệ thống cũ sang hệ thống mới:

```sql
-- Migrate old statuses to new statuses
UPDATE season_team_registrations
SET registration_status = CASE registration_status
  WHEN 'draft' THEN 'DRAFT_INVITE'
  WHEN 'submitted' THEN 'SUBMITTED'
  WHEN 'under_review' THEN 'SUBMITTED'
  WHEN 'approved' THEN 'APPROVED'
  WHEN 'rejected' THEN 'REJECTED'
  WHEN 'needs_resubmission' THEN 'REQUEST_CHANGE'
  ELSE registration_status
END;
```

## 🐛 Troubleshooting

### Lỗi: "Invalid state transition"

**Nguyên nhân:** Cố gắng chuyển từ trạng thái không hợp lệ.

**Giải pháp:** Kiểm tra state machine rules:
- `DRAFT_INVITE` chỉ có thể → `INVITED`
- `INVITED` chỉ có thể → `ACCEPTED` hoặc `DECLINED`
- `SUBMITTED` chỉ có thể → `APPROVED`, `REQUEST_CHANGE`, hoặc `REJECTED`

### Thông báo không được gửi

**Kiểm tra:**
1. Team có admin với email hợp lệ?
2. Notification service đang chạy?
3. Check logs: `backend/logs/notifications.log`

## 📞 Support

Nếu gặp vấn đề, liên hệ:
- Email: support@championleague.vn
- Slack: #season-registration-support
- Docs: https://docs.championleague.vn/registration-workflow

---

**Version:** 1.0.0  
**Last Updated:** 2025-01-29  
**Author:** Development Team
