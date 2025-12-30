# Referee Portal (Match Official)

Portal dành riêng cho **trọng tài và trợ lý trọng tài** (Match Officials) để quản lý và điều khiển trận đấu.

## ✨ Tính Năng

- 📅 **Lịch Trọng Tài**: Xem tất cả trận được phân công
- ⚽ **Điều Khiển Trận Đấu**: Ghi nhận Goal, Card, Substitution
- 👥 **Xem Đội Hình**: Hiển thị lineup chuyên nghiệp 2 đội
- 📝 **Báo Cáo**: Nộp match report sau trận

## 🚀 Quick Start

### 1. Đăng nhập
```
URL: /admin/login
Role: match_official (trong bảng user_role_assignments)
```

> **Lưu ý**: Portal này dành cho users có role `match_official` trong hệ thống.

### 2. Navigation
```
/referee/my-matches    → Danh sách trận đấu
/referee/match/:id     → Quản lý trận đấu
/referee/reports       → Lịch sử báo cáo
```

## 🎯 Quy Trình Chuẩn

**Trước trận** → Kiểm tra lịch + đội hình  
**Trong trận** → Ghi nhận sự kiện real-time  
**Sau trận** → Nộp báo cáo đầy đủ  

## 📁 Files

```
src/apps/referee/
├── RefereeApp.jsx
├── components/
│   └── RefereeLayout.jsx
└── pages/
    ├── MyMatchesPage.jsx
    ├── MatchControlPage.jsx
    └── ReportsPage.jsx
```

## 🎨 Design

- **Primary Color**: Yellow (#fbbf24) - Whistle/Authority
- **Icons**: Lucide React
- **Responsive**: Mobile-first design

## 📚 Documentation

Xem chi tiết: [REFEREE_PORTAL_GUIDE.md](../docs/REFEREE_PORTAL_GUIDE.md)
