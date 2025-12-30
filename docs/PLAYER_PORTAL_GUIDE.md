# Player Portal - Cổng thông tin Cầu thủ

## 🎯 Tổng quan

Player Portal là cổng thông tin dành riêng cho cầu thủ trong hệ thống quản lý giải VĐQG bóng đá. Cầu thủ có thể xem thông tin cá nhân, lịch thi đấu, thống kê và thành tích của mình.

## 📁 Cấu trúc Files

### Frontend (React + TypeScript + Tailwind CSS)

```
src/apps/player/
├── PlayerApp.jsx                    # Main app routing
├── components/
│   └── PlayerLayout.jsx             # Layout với navigation
└── pages/
    ├── PlayerDashboard.jsx          # Trang chủ - tổng quan
    ├── MyProfile.jsx                # Hồ sơ cá nhân
    ├── MyMatches.jsx                # Lịch thi đấu
    └── MyStatistics.jsx             # Thống kê chi tiết
```

### Backend (Node.js + TypeScript + SQL Server)

```
backend/src/
├── controllers/
│   └── playerPortalController.ts    # Controllers xử lý logic
└── routes/
    └── playerPortalRoutes.ts        # API routes
```

## 🔐 Phân quyền

### Role: `player`

Cầu thủ cần có role `player` hoặc `player_role` permission để truy cập Player Portal.

### Route Protection

```typescript
// Trong App.jsx
const PlayerRoute = ({ children }) => {
  const { isAuthenticated, user, status } = useAuth()
  const isPlayer = isAuthenticated && (
    user?.role === 'player' || 
    user?.roles?.includes('player')
  )
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" />
  }
  
  if (!isPlayer) {
    return <Navigate to="/portal" />
  }
  
  return children
}
```

## 🌐 Routes

### Frontend Routes

| Route | Component | Mô tả |
|-------|-----------|-------|
| `/player` | PlayerDashboard | Trang chủ - tổng quan |
| `/player/profile` | MyProfile | Hồ sơ cá nhân |
| `/player/matches` | MyMatches | Lịch thi đấu |
| `/player/statistics` | MyStatistics | Thống kê chi tiết |

### Backend API Endpoints

| Method | Endpoint | Permission | Mô tả |
|--------|----------|------------|-------|
| GET | `/api/player-portal/profile` | player_role | Lấy thông tin hồ sơ |
| PUT | `/api/player-portal/profile` | player_role | Cập nhật thông tin |
| GET | `/api/player-portal/statistics` | player_role | Lấy thống kê |
| GET | `/api/player-portal/matches` | player_role | Lấy lịch thi đấu |

## 📊 Tính năng chính

### 1. Dashboard (PlayerDashboard)

**Hiển thị:**
- Thông tin tóm tắt: bàn thắng, kiến tạo, trận đấu, phút thi đấu
- 3 trận đấu sắp tới
- 3 trận đấu gần đây với thống kê cá nhân
- Quick actions

**API Call:**
```javascript
const [profileRes, statsRes, matchesRes] = await Promise.all([
  apiClient.get('/api/player-portal/profile'),
  apiClient.get('/api/player-portal/statistics'),
  apiClient.get('/api/player-portal/matches'),
]);
```

### 2. My Profile (MyProfile)

**Hiển thị:**
- Avatar và ảnh bìa
- Thông tin cá nhân: tên, email, SĐT, ngày sinh, nơi sinh
- Thông tin sự nghiệp: CLB, vị trí, số áo, chiều cao, cân nặng
- Danh sách CLB từng khoác áo
- Danh hiệu & thành tích

**Chức năng:**
- Xem hồ sơ chi tiết
- Cập nhật thông tin liên lạc (email, SĐT)

### 3. My Matches (MyMatches)

**Hiển thị:**
- Danh sách tất cả trận đấu của đội
- Filter: Tất cả / Sắp diễn ra / Đã kết thúc
- Thông tin trận: đối thủ, tỷ số, thời gian, địa điểm
- Thống kê cá nhân mỗi trận: phút thi đấu, bàn thắng, kiến tạo, thẻ phạt

**Badge kết quả:**
- Thắng (màu xanh)
- Hòa (màu xám)
- Thua (màu đỏ)
- Sắp diễn ra (màu xanh dương)

### 4. My Statistics (MyStatistics)

**Hiển thị:**
- Tổng quan theo mùa giải: trận đấu, bàn thắng, kiến tạo, phút thi đấu
- Biểu đồ bàn thắng theo tháng
- So sánh với trung bình giải
- Thẻ phạt, trận giữ sạch lưới, MOTM awards
- Top màn trình diễn xuất sắc nhất

**Filter:**
- Chọn mùa giải (2025, 2024, 2023...)

## 🎨 UI/UX Features

### Design System
- **Color Scheme**: Green (primary) - phù hợp với bóng đá
- **Components**: Cards, Stats, Badges, Charts
- **Responsive**: Hoàn toàn responsive trên mobile & desktop
- **Icons**: Lucide React icons

### Layout Structure
- **Header**: Logo, Title, User info, Logout
- **Navigation**: Horizontal tabs với icons
- **Content**: Cards và grids responsive
- **Footer**: Copyright info

### Interactive Elements
- Hover effects trên cards
- Smooth transitions
- Loading states
- Empty states với illustrations
- Color-coded badges (thắng/thua/hòa)

## 🔧 Cài đặt & Sử dụng

### 1. Frontend Setup

File `App.jsx` đã được cập nhật tự động với PlayerRoute và lazy loading:

```javascript
const PlayerApp = lazy(() => import('./apps/player/PlayerApp'))

<Route 
  path="/player/*" 
  element={
    <PlayerRoute>
      <PlayerApp />
    </PlayerRoute>
  } 
/>
```

### 2. Backend Setup

File `app.ts` đã được cập nhật:

```typescript
import playerPortalRoutes from "./routes/playerPortalRoutes";

app.use("/api/player-portal", playerPortalRoutes);
```

### 3. Database Requirements

Player Portal cần các tables sau:
- `players` - Thông tin cầu thủ
- `teams` - Thông tin đội bóng
- `matches` - Thông tin trận đấu
- `match_events` - Sự kiện trận đấu (bàn thắng, kiến tạo, thẻ phạt)
- `user_accounts` - Tài khoản người dùng

### 4. Permissions Setup

Đảm bảo có permission `player_role` trong database:

```sql
INSERT INTO permissions (name, description)
VALUES ('player_role', 'Access to player portal');
```

Gán permission cho role player:

```sql
-- Giả sử role_id của player là 5
INSERT INTO role_permission_assignments (role_id, permission_id)
SELECT 5, permission_id 
FROM permissions 
WHERE name = 'player_role';
```

## 🧪 Testing

### Test Flow

1. **Đăng nhập** với tài khoản có role `player`
2. **Truy cập** `/player` - sẽ redirect về login nếu chưa xác thực
3. **Xem Dashboard** - kiểm tra thống kê tổng quan
4. **Xem Profile** - kiểm tra thông tin cá nhân
5. **Xem Matches** - kiểm tra lịch thi đấu và filter
6. **Xem Statistics** - kiểm tra biểu đồ và thống kê

### Mock Data

Nếu backend chưa có dữ liệu, các component đã có mock data mẫu để test UI:

```javascript
// MyProfile.jsx - line 22
setProfile({
  fullName: 'Nguyễn Văn A',
  position: 'Tiền đạo',
  jerseyNumber: 10,
  // ... more mock data
});
```

## 🚀 Future Enhancements

Các tính năng có thể mở rộng:

1. **Achievements Page** - Trang danh hiệu chi tiết
2. **Training Schedule** - Lịch tập luyện
3. **Medical Records** - Hồ sơ y tế (chấn thương, phục hồi)
4. **Contract Management** - Quản lý hợp đồng
5. **Performance Reports** - Báo cáo đánh giá từ HLV
6. **Team Chat** - Chat nội bộ đội
7. **Video Analysis** - Xem lại video trận đấu
8. **Fitness Tracking** - Theo dõi thể lực

## 📝 Notes

- Player Portal độc lập hoàn toàn với Admin Portal
- Cầu thủ **CHỈ** được xem và cập nhật thông tin của chính mình
- Mọi API đều có authentication và authorization middleware
- UI được thiết kế theo chuẩn modern football apps (Sofascore, OneFootball)

## 🐛 Troubleshooting

### Lỗi 401 Unauthorized
- Kiểm tra token trong localStorage
- Đảm bảo user có role `player`
- Kiểm tra permission `player_role` đã được gán

### Lỗi 404 Not Found
- Kiểm tra route đã được register trong `app.ts`
- Kiểm tra backend server đã chạy
- Kiểm tra API endpoint đúng `/api/player-portal/*`

### Không hiển thị dữ liệu
- Kiểm tra player_id được liên kết với user_id
- Kiểm tra database có dữ liệu matches và match_events
- Xem console log để debug API response

---

**Tác giả:** GitHub Copilot  
**Ngày tạo:** 30/12/2025  
**Version:** 1.0.0
