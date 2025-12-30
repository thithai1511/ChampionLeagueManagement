# Hướng Dẫn Referee Portal - Hệ Thống Trọng Tài

## 📋 Tổng Quan

Referee Portal là hệ thống dành riêng cho trọng tài và trợ lý để quản lý, điều khiển và báo cáo các trận đấu được phân công.

## 🎯 Tính Năng Chính

### 1️⃣ **Quản Lý Lịch Trận Đấu**
- Xem danh sách tất cả trận đấu được phân công
- Lọc theo: Sắp tới, Hôm nay, Đã qua, Tất cả
- Hiển thị thông tin đầy đủ:
  - Tên 2 đội
  - Ngày giờ thi đấu
  - Địa điểm (sân vận động)
  - Vai trò (Trọng tài chính / Trợ lý)
  - Trạng thái trận đấu

### 2️⃣ **Điều Khiển Trận Đấu (Match Control)**
Trọng tài có toàn quyền quản lý diễn biến trận đấu:

#### ⚽ Ghi Nhận Sự Kiện
- **Bàn thắng (Goal)**: Ghi nhận cầu thủ ghi bàn
- **Thẻ vàng (Yellow Card)**: Cảnh cáo cầu thủ
- **Thẻ đỏ (Red Card)**: Truất quyền thi đấu
- **Thay người (Substitution)**: Ghi nhận cầu thủ vào/ra sân

#### 📊 Timeline Diễn Biến
- Hiển thị thời gian real-time của trận đấu
- Timeline tất cả sự kiện theo thứ tự thời gian
- Có thể xóa sự kiện nếu nhầm lẫn

#### 🎛️ Quản Lý Match Time
- Tự động tính thời gian từ lúc bắt đầu
- Có thể điều chỉnh thủ công nếu cần
- Hiển thị rõ ràng trên scoreboard

### 3️⃣ **Xem Đội Hình (Lineups)**
- Hiển thị đội hình 2 đội với giao diện chuyên nghiệp
- Sân bóng gradient xanh với vạch sân chuẩn
- Player badges đầy đủ thông tin:
  - Số áo, tên cầu thủ, vị trí
  - Trạng thái (thẻ vàng/đỏ, ghi bàn)
- Hỗ trợ nhiều formation (4-4-2, 4-3-3, 4-2-3-1, v.v.)
- Hiển thị cầu thủ dự bị

### 4️⃣ **Nộp Báo Cáo (Match Report)**
Sau trận đấu, trọng tài phải nộp báo cáo gồm:
- **Thời tiết**: Điều kiện thời tiết khi thi đấu
- **Số khán giả**: Ước tính số lượng khán giả
- **Ghi chú chung**: Nhận xét về trận đấu
- **Sự cố**: Ghi nhận tranh cãi, chấn thương, sự cố đặc biệt

### 5️⃣ **Lịch Sử Báo Cáo**
- Xem lại tất cả báo cáo đã nộp
- Theo dõi trạng thái: Đã nộp / Chưa nộp
- Tìm kiếm theo ngày, đội

## 🚀 Cách Sử Dụng

### Đăng Nhập
```
URL: http://localhost:3000/admin/login
- Username: Tài khoản trọng tài
- Password: Mật khẩu
```
Sau khi đăng nhập, hệ thống tự động chuyển đến `/referee/my-matches`

### Quy Trình Làm Việc Chuẩn

#### **Trước Trận Đấu**
1. Đăng nhập vào Referee Portal
2. Vào **"Lịch Trọng Tài"**
3. Kiểm tra trận đấu được phân công
4. Click **"Quản lý"** để xem chi tiết
5. Kiểm tra đội hình 2 đội (tab **"Đội hình"**)

#### **Trong Trận Đấu**
1. Vào tab **"Điều khiển"**
2. Bắt đầu theo dõi thời gian (tự động)
3. Ghi nhận sự kiện khi xảy ra:
   - Click nút tương ứng (Goal, Yellow, Red, Sub)
   - Chọn cầu thủ từ dropdown
   - Xác nhận

#### **Sau Trận Đấu**
1. Vào tab **"Báo cáo"**
2. Điền đầy đủ thông tin:
   - Thời tiết
   - Số khán giả
   - Ghi chú
   - Sự cố (nếu có)
3. Click **"Nộp Báo Cáo"**
4. Kiểm tra trong **"Báo Cáo"** menu

## 🎨 Giao Diện

### Màu Sắc Chủ Đạo
- **Vàng (#fbbf24)**: Màu chủ đạo - tượng trưng cho thẻ vàng và quyền lực trọng tài
- **Slate/Gray**: Nền và text chính
- **Blue**: Team Home
- **Red**: Team Away

### Layout
- **Header**: Logo Whistle + Tên referee + Logout
- **Navigation**: Sticky top với 2 menu chính
- **Content Area**: Responsive, tối ưu cho tablet và desktop

## 🔐 Phân Quyền

### Referee có quyền:
- ✅ Xem lịch trận đấu được phân công
- ✅ Xem đội hình 2 đội
- ✅ Ghi nhận sự kiện trận đấu (Goal, Card, Sub)
- ✅ Xóa sự kiện nếu nhầm lẫn
- ✅ Điều chỉnh thời gian trận đấu
- ✅ Nộp báo cáo sau trận
- ✅ Xem lịch sử báo cáo của mình

### Referee KHÔNG có quyền:
- ❌ Phân công trọng tài cho trận khác
- ❌ Sửa đội hình cầu thủ
- ❌ Truy cập khu vực admin
- ❌ Quản lý user, team, season

## 📱 Responsive Design

### Desktop (≥1024px)
- Layout 3 cột cho match control
- Grid 2 cột cho lineups
- Full features

### Tablet (768-1023px)
- Layout 2 cột
- Condensed navigation
- Touch-optimized buttons

### Mobile (< 768px)
- Single column
- Stacked layout
- Simplified controls
- Large touch targets

## 🛠️ Technical Stack

### Frontend
- **React 18**: UI framework
- **React Router v6**: Routing
- **Tailwind CSS**: Styling
- **Lucide React**: Icons
- **React Hot Toast**: Notifications

### Integration
- **API Service**: Centralized API calls
- **Auth Context**: User authentication
- **Protected Routes**: Role-based access

## 📂 Cấu Trúc Files

```
src/apps/referee/
├── RefereeApp.jsx                 # Main app entry
├── components/
│   ├── RefereeLayout.jsx          # Layout với header, nav, footer
│   └── LineupDisplay.jsx          # Copy from admin (reused)
└── pages/
    ├── MyMatchesPage.jsx          # Danh sách trận đấu
    ├── MatchControlPage.jsx       # Điều khiển trận đấu
    └── ReportsPage.jsx            # Lịch sử báo cáo
```

## 🔄 API Endpoints Sử Dụng

### Match Officials
- `GET /match-officials/my-assignments` - Lấy trận được phân công
- `GET /match-officials/my-reports` - Lịch sử báo cáo

### Matches
- `GET /matches/:id` - Chi tiết trận đấu
- `GET /matches/:id/events` - Danh sách sự kiện
- `POST /matches/:id/events` - Tạo sự kiện mới
- `DELETE /match-events/:id` - Xóa sự kiện
- `GET /matches/:id/lineups` - Đội hình 2 đội

### Reports
- `POST /matches/:id/referee-report` - Nộp báo cáo
- `POST /matches/:id/mark-referee-report` - Đánh dấu đã nộp

## 🎯 Best Practices

### Cho Trọng Tài
1. **Kiểm tra lịch trước 24h**: Xác nhận trận được phân công
2. **Xem đội hình trước 2h**: Nắm rõ cầu thủ của 2 đội
3. **Ghi nhận ngay lập tức**: Không trì hoãn việc ghi sự kiện
4. **Kiểm tra lại**: Xem timeline trước khi kết thúc
5. **Nộp báo cáo trong 2h**: Sau khi trận đấu kết thúc

### Cho Developers
1. Sử dụng `useAuth()` để lấy thông tin user
2. Check role trước khi render sensitive data
3. Handle loading states properly
4. Toast notifications cho user feedback
5. Error boundaries cho crash protection

## 🐛 Troubleshooting

### Không thấy trận đấu nào?
- Kiểm tra user có role `REFEREE`
- Kiểm tra đã được admin phân công chưa
- Xem trong database `match_officials` table

### Không ghi được sự kiện?
- Kiểm tra match status (phải là IN_PROGRESS)
- Kiểm tra cầu thủ có trong lineup không
- Kiểm tra API response trong console

### Báo cáo không nộp được?
- Điền đầy đủ required fields
- Kiểm tra match đã kết thúc chưa
- Xem network tab để debug

## 🚀 Future Enhancements

### V2 Features
- [ ] Live chat với supervisor
- [ ] VAR (Video Assistant Referee) support
- [ ] Offline mode với sync
- [ ] Multi-language support
- [ ] Push notifications
- [ ] Photo/Video upload
- [ ] Injury time management
- [ ] Player statistics summary

## 📞 Liên Hệ & Hỗ Trợ

Nếu có vấn đề kỹ thuật hoặc cần hỗ trợ:
- Email: support@championleague.vn
- Hotline: 1900-xxxx
- Admin Portal: Tạo ticket hỗ trợ

---

**Referee Portal** - Professional Match Official Management System
© 2025 Champion League Management
