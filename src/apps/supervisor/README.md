# Supervisor Portal - Hệ Thống Giám Sát Trận Đấu

Portal dành riêng cho **Giám sát viên** (Match Supervisors) để đánh giá và báo cáo công tác tổ chức trận đấu.

## ✨ Tính Năng

- 📅 **Lịch Giám Sát**: Xem tất cả trận đấu được phân công giám sát
- 🔍 **Giám Sát Trận Đấu**: Đánh giá tổ chức, công tác trọng tài, cơ sở vật chất
- 📝 **Báo Cáo Chi Tiết**: Ghi nhận sai sót, kiến nghị kỷ luật
- 📚 **Lịch Sử**: Xem lại các báo cáo đã nộp

## 🎯 Nhiệm Vụ Giám Sát Viên

### 1️⃣ **Đánh Giá Tổ Chức Trận Đấu**
- Đánh giá chất lượng tổ chức (1-10)
- Đánh giá cơ sở vật chất, sân bãi (1-10)
- Kiểm tra tuân thủ quy định

### 2️⃣ **Giám Sát Công Tác Trọng Tài**
- Đánh giá hiệu suất trọng tài: Xuất sắc / Đạt / Cần cải thiện / Kém
- Ghi nhận sai sót từ trọng tài (nếu có)
- Nhận xét về xử lý tình huống

### 3️⃣ **Ghi Nhận Sự Cố**
- **Từ cầu thủ**: Hành vi phi thể thao, bạo lực
- **Từ BTC sân**: Sai sót tổ chức, an ninh, cơ sở vật chất
- **Các sự cố khác**: Khán giả, môi trường thi đấu

### 4️⃣ **Kiến Nghị Kỷ Luật**
- Đề xuất biện pháp kỷ luật cho BTC
- Gửi báo cáo cho ban kỷ luật
- Theo dõi xử lý sau trận

## 🚀 Quick Start

### 1. Đăng nhập
```
URL: /admin/login
Role: supervisor (trong bảng user_role_assignments)
```

> **Lưu ý**: Portal này dành cho users có role `supervisor` trong hệ thống.

### 2. Navigation
```
/supervisor/my-assignments  → Danh sách trận giám sát
/supervisor/match/:id       → Giám sát trận đấu
/supervisor/reports         → Lịch sử báo cáo
```

## 🎯 Quy Trình Làm Việc

### **Trước Trận Đấu**
1. Đăng nhập vào Supervisor Portal
2. Vào **"Lịch Giám Sát"**
3. Kiểm tra trận đấu được phân công
4. Chuẩn bị checklist giám sát

### **Trong Trận Đấu**
1. Có mặt tại sân trước giờ thi đấu
2. Quan sát công tác tổ chức
3. Theo dõi công tác trọng tài
4. Ghi chú các sự cố, vi phạm
5. Đánh giá cơ sở vật chất

### **Sau Trận Đấu**
1. Vào tab **"Báo Cáo Giám Sát"**
2. Điền đầy đủ form báo cáo:
   - Đánh giá tổ chức (1-10)
   - Đánh giá cơ sở vật chất (1-10)
   - Tuân thủ quy định
   - Đánh giá trọng tài
   - Ghi chú sai sót từ trọng tài
   - Sự cố từ cầu thủ
   - Sai sót từ BTC sân
   - Kiến nghị kỷ luật
   - Ghi chú chung (bắt buộc)
3. Click **"Nộp Báo Cáo"**
4. Kiểm tra trong **"Báo Cáo"** menu

## 📋 Form Báo Cáo Chi Tiết

### Đánh Giá Số (1-10)
- **Tổ chức trận đấu**: Tính chuyên nghiệp, chu đáo
- **Cơ sở vật chất**: Sân bãi, phòng thay đồ, thiết bị

### Tuân Thủ Quy Định
- ✅ **Tuân thủ đầy đủ**: Không có vi phạm
- ⚠️ **Có sai sót nhỏ**: Vi phạm nhẹ, không ảnh hưởng
- ❌ **Có sai sót nghiêm trọng**: Vi phạm lớn, cần xử lý

### Đánh Giá Trọng Tài
- 🌟 **Xuất sắc**: Xử lý tốt, không sai sót
- ✅ **Đạt yêu cầu**: Đạt chuẩn, sai sót nhỏ
- ⚠️ **Cần cải thiện**: Nhiều sai sót
- ❌ **Kém**: Không đạt chuẩn

### Ghi Chú Text
- **Sai sót trọng tài**: Mô tả chi tiết các tình huống
- **Sự cố cầu thủ**: Hành vi, bạo lực, tranh cãi
- **Sai sót BTC**: Tổ chức, an ninh, thiết bị
- **Kiến nghị kỷ luật**: Đề xuất xử phạt cụ thể
- **Ghi chú chung** (bắt buộc): Tổng quan trận đấu

## 🎨 Giao Diện

### Màu Sắc
- **Purple/Indigo**: Màu chủ đạo - quyền lực giám sát
- **Green**: Đạt chuẩn, tuân thủ
- **Yellow**: Cảnh báo, cần lưu ý
- **Red**: Nghiêm trọng, kiến nghị kỷ luật

### Icons
- 🛡️ Shield: Giám sát viên
- 📅 Calendar: Lịch trận
- 📝 FileText: Báo cáo
- 👁️ Eye: Xem chi tiết
- ✅ CheckCircle: Đã nộp báo cáo

## 📂 File Structure

```
src/apps/supervisor/
├── SupervisorApp.jsx                 # Main app entry
├── components/
│   └── SupervisorLayout.jsx          # Layout với header, nav
└── pages/
    ├── MyAssignmentsPage.jsx         # Danh sách trận giám sát
    ├── MatchSupervisionPage.jsx      # Form báo cáo giám sát
    └── ReportsPage.jsx               # Lịch sử báo cáo
```

## 🔄 API Endpoints

### Matches
- `GET /matches` - Lấy tất cả trận (filter by supervisor_id)
- `GET /matches/:id` - Chi tiết trận đấu
- `POST /matches/:id/supervisor-report` - Nộp báo cáo giám sát
- `POST /matches/:id/mark-supervisor-report` - Đánh dấu đã nộp

## 🔐 Permissions

Role `supervisor` có các quyền:
- ✅ `manage_matches` - Xem thông tin trận đấu
- ✅ `manage_discipline` - Kiến nghị kỷ luật

## ⚖️ So Sánh: Trọng Tài vs Giám Sát Viên

### Trọng Tài (Referee)
- ⚽ Điều khiển trận đấu
- 📊 Ghi nhận sự kiện (Goal, Card, Sub)
- 🎯 Báo cáo thông số trận đấu (tỷ số, cầu thủ xuất sắc, thẻ phạt)

### Giám Sát Viên (Supervisor)
- 👁️ Giám sát từ xa
- 📝 Đánh giá tổ chức, trọng tài
- ⚖️ Ghi nhận sai sót, kiến nghị kỷ luật

## 🐛 Troubleshooting

### Không thấy trận đấu?
- Kiểm tra user có role `supervisor`
- Kiểm tra đã được admin phân công (`supervisor_id` trong `matches` table)
- Verify API `/matches` trả về đúng data

### Không nộp được báo cáo?
- Điền đầy đủ **Ghi chú chung** (required)
- Kiểm tra match status
- Xem console logs

### Không truy cập được portal?
- Verify user có role `supervisor` trong `user_role_assignments`
- Check `SupervisorRoute` trong App.jsx
- Xem redirect logic trong LoginPage

## 🚀 Future Enhancements

- [ ] Photo/Video upload cho evidence
- [ ] Real-time chat với admin
- [ ] Template báo cáo có sẵn
- [ ] Export PDF báo cáo
- [ ] Push notification khi có trận mới
- [ ] Offline mode với sync
- [ ] Multi-language support
- [ ] Disciplinary tracking system integration

---

**© 2025 Champion League Management - Supervisor Portal**
