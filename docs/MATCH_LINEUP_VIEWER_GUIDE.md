# Hướng Dẫn Xem Đội Hình Ra Sân & Chi Tiết Trận Đấu

## 📋 Tổng Quan

Khán giả giờ đây có thể xem đầy đủ thông tin chi tiết trận đấu với giao diện đẹp và chuyên nghiệp:
- ⚽ **Kết quả & Tỷ số**
- 👥 **Đội hình ra sân chuyên nghiệp** (sân bóng xanh, vị trí chính xác theo formation)
- 🔄 **Thay người** 
- 📊 **Diễn biến trận đấu** (ghi bàn, thẻ phạt, sự kiện)
- 📈 **Thống kê trận đấu**

## ✨ Tính Năng Mới - Đội Hình Chuyên Nghiệp

### 🎨 Giao Diện Sân Bóng Đẹp Mắt
- **Sân bóng gradient xanh** với hiệu ứng cỏ tự nhiên
- **Vạch sân chuyên nghiệp**: vòng tròn giữa sân, vạch trung tâm, vùng cấm địa
- **Viền bo tròn mượt mà** với shadow depth
- **Responsive design**: tự động thu gọn đẹp trên mobile

### 👤 Player Badge Chuyên Nghiệp
Mỗi cầu thủ hiển thị với badge đầy đủ thông tin:

#### 🔵 Áo số màu đội
- Màu tùy chỉnh theo đội (Home: xanh dương, Away: đỏ)
- Số áo lớn, rõ ràng với viền trắng nổi bật
- Hiệu ứng glow khi hover

#### 📛 Thông tin cầu thủ
- Tên cầu thủ (rõ ràng, không bị chồng chéo)
- Vị trí (GK, DF, MF, FW)
- Badge bo tròn với viền màu đội

#### 🏅 Biểu tượng trạng thái
- **C** (Captain): Badge vàng kim cho đội trưởng
- **⚽** Biểu tượng bóng nếu ghi bàn (animate bounce)
- **🟨** Thẻ vàng
- **🟥** Thẻ đỏ  
- **⚠️** Chấn thương/cảnh báo

### 📐 Formation System (Sơ đồ chiến thuật)

Hỗ trợ các formation phổ biến với vị trí chính xác:

#### ✅ Formations được hỗ trợ:
- **4-4-2**: Cổ điển, cân bằng
- **4-3-3**: Tấn công, pressing cao
- **4-2-3-1**: Linh hoạt, hiện đại
- **3-5-2**: Wingback, kiểm soát giữa sân
- **3-4-3**: Tấn công toàn diện
- **5-3-2**: Phòng ngự chắc chắn
- **4-5-1**: Phòng thủ phản công

#### 📍 Vị trí tự động
- Goalkeeper (8% từ dưới)
- Hàng thủ (25% từ dưới)
- Tiền vệ phòng ngự (42%)
- Tiền vệ tấn công (60%)
- Tiền đạo (75-80%)

### 🎯 Responsive Design

#### 💻 Desktop
- Sân bóng full size với aspect ratio 5:7
- Player badges kích thước lớn (56x56px)
- Font size rõ ràng
- Grid 4 cột cho dự bị

#### 📱 Mobile
- Sân bóng tự động scale
- Player badges nhỏ hơn (48x48px)
- Font size điều chỉnh
- Grid 2 cột cho dự bị
- Touch-friendly sizing

## 🎯 Cách Sử Dụng

### 1. Xem Danh Sách Trận Đấu

Truy cập một trong các trang sau:

#### Trang Matches (Danh sách trận đấu)
```
http://localhost:3000/matches
```
- Xem tất cả trận đấu theo vòng đấu
- Lọc theo trạng thái: Trực tiếp, Sắp diễn ra, Đã kết thúc
- Mỗi trận có nút **"Xem chi tiết"**

#### Trang Match Center (Trung tâm trận đấu)
```
http://localhost:3000/match-center
```
- Giao diện đẹp hơn với banner Champions League
- Lọc theo mùa giải, trạng thái
- Click vào bất kỳ trận đấu nào để xem chi tiết

### 2. Xem Chi Tiết Trận Đấu

Khi click vào một trận đấu, bạn sẽ được chuyển đến:
```
http://localhost:3000/matches/:matchId
```
Ví dụ: `http://localhost:3000/matches/7747`

### 3. Các Tab Thông Tin

Trang chi tiết trận đấu có 4 tab chính:

#### 📊 **Tab Tổng Quan**
- Thống kê nhanh: Tổng bàn thắng, sự kiện, cầu thủ
- Diễn biến gần đây (5 sự kiện mới nhất)
- Trạng thái trận đấu (Trực tiếp, Sắp diễn ra, Đã kết thúc)

#### 👥 **Tab Đội Hình**
**Hiển thị đội hình của 2 đội song song:**

✅ **Đội hình chính thức (Starting XI)**
- Hiển thị trên sân cỏ với formation (ví dụ: 4-4-2, 4-3-3)
- Hiển thị số áo, tên cầu thủ, vị trí
- Đánh dấu đội trưởng (⭐ biểu tượng vương miện)

✅ **Cầu thủ dự bị (Substitutes)**
- Danh sách cầu thủ trên ghế dự bị
- Số áo, tên, vị trí

✅ **Thay người đã thực hiện**
- ↓ Cầu thủ ra sân (số phút thi đấu)
- ↑ Cầu thủ vào sân thay thế

#### ⚡ **Tab Diễn Biến**
**Timeline đầy đủ các sự kiện:**
- ⚽ Bàn thắng
- ⚽ (OG) Phản lưới nhà
- 🟨 Thẻ vàng
- 🟥 Thẻ đỏ
- 🔄 Thay người
- Phút xảy ra sự kiện
- Tên cầu thủ liên quan

#### 📈 **Tab Thống Kê**
- Thống kê chi tiết (sẽ được cập nhật sau trận)

## 🔧 Cấu Trúc Kỹ Thuật

### Files Đã Tạo

#### 1. **LineupDisplay.jsx** - Component hiển thị đội hình
```
src/apps/public/components/LineupDisplay.jsx
```
**Chức năng:**
- Hiển thị đội hình trên sân cỏ (football field view)
- Map formation (4-4-2, 4-3-3, etc.) vào vị trí cầu thủ
- Hiển thị số áo, tên, vị trí, đội trưởng
- Danh sách cầu thủ dự bị
- Lịch sử thay người

**Props:**
```javascript
<LineupDisplay 
  lineup={[...]}        // Array of players
  teamName="Team A"     // Tên đội
  formation="4-4-2"     // Sơ đồ chiến thuật
/>
```

#### 2. **MatchDetailPage.jsx** - Trang chi tiết trận đấu
```
src/apps/public/pages/MatchDetailPage.jsx
```
**Chức năng:**
- Load dữ liệu từ 3 API endpoints:
  - `/api/matches/:matchId` - Thông tin trận đấu
  - `/api/matches/:matchId/events` - Diễn biến
  - `/api/matches/:matchId/lineups` - Đội hình
- 4 tabs: Overview, Lineups, Events, Stats
- Responsive design, đẹp trên mobile & desktop
- Real-time status (Live, Finished, Scheduled)

### Routes Đã Cập Nhật

**File:** `src/apps/public/PublicApp.jsx`

```javascript
// Route mới được thêm:
<Route path="matches/:matchId" element={<MatchDetailPage />} />
```

**Các đường dẫn hoạt động:**
- `/matches` - Danh sách trận đấu
- `/matches/7747` - Chi tiết trận #7747
- `/match-center` - Trung tâm trận đấu (cũng link đến detail)

### Components Đã Cập Nhật

#### **MatchCard.jsx**
```javascript
// Thêm nút "Xem chi tiết"
<button onClick={handleViewDetails}>
  Xem chi tiết
</button>
```

#### **MatchCenterPage.jsx**
```javascript
// Click vào card sẽ navigate đến detail
onClick={() => navigate(`/matches/${match.id}`)}
```

## 📡 API Endpoints Sử Dụng

### 1. Lấy thông tin trận đấu
```http
GET /api/matches/:matchId
```
**Response:**
```json
{
  "match_id": 7747,
  "home_team_name": "Arsenal",
  "away_team_name": "Chelsea",
  "home_score": 2,
  "away_score": 1,
  "status": "FINISHED",
  "scheduled_kickoff": "2025-12-30T19:00:00Z",
  "stadium_name": "Emirates Stadium"
}
```

### 2. Lấy đội hình
```http
GET /api/matches/:matchId/lineups
```
**Response:**
```json
{
  "data": [
    {
      "playerId": 123,
      "playerName": "Bukayo Saka",
      "jerseyNumber": 7,
      "position": "RW",
      "isStarting": true,
      "isCaptain": false,
      "seasonTeamId": 456,
      "status": "active"
    },
    {
      "playerId": 124,
      "playerName": "Martin Ødegaard",
      "jerseyNumber": 8,
      "position": "CAM",
      "isStarting": true,
      "isCaptain": true,
      "seasonTeamId": 456,
      "status": "active"
    }
  ]
}
```

### 3. Lấy diễn biến trận đấu
```http
GET /api/matches/:matchId/events
```
**Response:**
```json
{
  "data": [
    {
      "eventId": 1,
      "type": "GOAL",
      "minute": 23,
      "playerId": 123,
      "playerName": "Bukayo Saka",
      "teamId": 456,
      "description": "Penalty goal"
    },
    {
      "eventId": 2,
      "type": "SUBSTITUTION",
      "minute": 67,
      "playerId": 125,
      "playerName": "Gabriel Jesus",
      "assistPlayerId": 123,
      "teamId": 456
    }
  ]
}
```

## 🎨 Tính Năng UI/UX

### Responsive Design
- ✅ Desktop: Grid 2 cột cho đội hình
- ✅ Tablet: Single column
- ✅ Mobile: Optimized cho màn hình nhỏ

### Visual Effects
- ✅ Sân cỏ với vạch kẻ sân
- ✅ Badge đội trưởng (👑)
- ✅ Live indicator (🔴 chấm đỏ nhấp nháy)
- ✅ Status badges với màu sắc (Live: Đỏ, Finished: Xám, Upcoming: Xanh)
- ✅ Timeline với đường thẳng dọc
- ✅ Icons cho sự kiện (⚽🟨🟥🔄)

### Trạng Thái Trận Đấu
- **🔴 LIVE** - Trận đang diễn ra (IN_PLAY, HALFTIME, PAUSED)
- **✅ FINISHED** - Trận đã kết thúc
- **📅 SCHEDULED** - Trận sắp diễn ra

## 🧪 Testing

### Test Flow 1: Xem trận đang diễn ra
1. Truy cập `http://localhost:3000/matches`
2. Tìm trận có badge "🔴 Trực tiếp"
3. Click "Xem chi tiết"
4. Kiểm tra:
   - Tỷ số hiển thị
   - Tab "Đội hình" có 2 đội
   - Tab "Diễn biến" có events

### Test Flow 2: Xem trận đã kết thúc
1. Truy cập `http://localhost:3000/match-center`
2. Filter "Đã kết thúc"
3. Click vào bất kỳ trận nào
4. Kiểm tra:
   - Tỷ số cuối cùng
   - Đội hình đầy đủ của 2 đội
   - Timeline diễn biến đầy đủ
   - Thông tin thay người

### Test Flow 3: Xem trận sắp diễn ra
1. Filter "Sắp diễn ra"
2. Click vào trận
3. Kiểm tra:
   - Hiển thị giờ bóng lăn
   - Đội hình có thể chưa có (nếu chưa nộp)
   - Message "Chưa có đội hình"

## 🚀 Deployment Notes

### Điều kiện để hiển thị đội hình:
1. ✅ Đội hình phải được nộp bởi đội (`/api/matches/:matchId/lineups`)
2. ✅ Đội hình phải được BTC duyệt (status = 'APPROVED')
3. ✅ Có ít nhất 11 cầu thủ chính

### Backend Dependencies
- ✅ `matchLineupService.ts` - Service lấy đội hình
- ✅ `matchEventService.ts` - Service lấy events
- ✅ `matchDetailRoutes.ts` - API routes
- ✅ Bảng `match_lineups` trong database

## 📝 Notes

### Dữ Liệu Cần Có
- Đội hình phải được nộp trước qua trang Team Portal
- BTC phải duyệt đội hình (APPROVED status)
- Match events được ghi nhận qua Live Match Update page (Admin)

### Giới Hạn
- Formation hiển thị đơn giản (không phức tạp như tactical view)
- Thống kê chi tiết chưa được implement (tab Stats để trống)
- Player photos chưa được hiển thị (chỉ có số áo)

### Future Enhancements
- [ ] Thêm player photos/avatars
- [ ] Formation editor interactive
- [ ] Real-time updates qua WebSocket
- [ ] Match statistics (shots, possession, passes)
- [ ] Video highlights integration
- [ ] Download match report PDF

## ✅ Summary

**Đã hoàn thành:**
1. ✅ Component `LineupDisplay` để hiển thị đội hình sân cỏ
2. ✅ Page `MatchDetailPage` với 4 tabs đầy đủ
3. ✅ Route `/matches/:matchId` 
4. ✅ Link từ MatchCard & MatchCenterPage
5. ✅ API integration (lineups, events, match details)
6. ✅ Responsive design
7. ✅ Real-time status indicators

**Cách truy cập:**
- Danh sách: `http://localhost:3000/matches`
- Chi tiết: `http://localhost:3000/matches/7747`
- Match Center: `http://localhost:3000/match-center`

---

**📌 Lưu ý:** Đảm bảo backend server đang chạy và database có dữ liệu đội hình đã được nộp & duyệt.
