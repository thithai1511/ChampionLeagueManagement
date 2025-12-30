# Hướng dẫn tạo báo cáo cấu trúc Database

Có 3 cách để liệt kê tất cả các bảng và thuộc tính trong database:

## Cách 1: Sử dụng TypeScript Script (Khuyến nghị)

Script này sẽ tự động tạo báo cáo dạng JSON và Markdown.

### Chạy script:

```bash
npm run list-tables
```

Hoặc:

```bash
ts-node scripts/list_all_tables_and_columns.ts
```

### Kết quả:

Script sẽ tạo 2 file trong thư mục `backend/reports/`:
- `database_schema_[timestamp].json` - Dữ liệu dạng JSON, dễ xử lý bằng code
- `database_schema_[timestamp].md` - Báo cáo dạng Markdown, dễ đọc và in

### Nội dung báo cáo bao gồm:

- ✅ Tổng số bảng
- ✅ Tổng số cột
- ✅ Tổng số dòng dữ liệu
- ✅ Chi tiết từng bảng:
  - Tên cột
  - Kiểu dữ liệu (với độ dài nếu có)
  - Cho phép NULL hay không
  - Giá trị mặc định
  - Có phải khóa chính không
  - Có phải khóa ngoại không (và tham chiếu đến bảng/cột nào)

---

## Cách 2: Sử dụng SQL Script đơn giản (Khuyến nghị cho export Excel)

Script SQL này trả về kết quả dạng bảng, dễ export ra Excel/CSV.

### File: `backend/src/db/migrations/014_simple_table_columns_report.sql`

### Cách chạy:

1. Mở **SQL Server Management Studio (SSMS)**
2. Kết nối đến database
3. Mở file `014_simple_table_columns_report.sql`
4. Chạy (F5)

### Kết quả:

Script sẽ trả về 4 bảng kết quả:

1. **Tổng quan các bảng**: Tên bảng, số cột, số khóa chính, số khóa ngoại
2. **Chi tiết tất cả các cột**: Thông tin đầy đủ về mỗi cột trong mỗi bảng
3. **Tổng hợp theo kiểu dữ liệu**: Thống kê các kiểu dữ liệu được sử dụng
4. **Các khóa ngoại**: Danh sách tất cả các foreign key và mối quan hệ

### Export ra Excel:

- Click chuột phải vào kết quả → **Copy with Headers**
- Dán vào Excel
- Hoặc: Click chuột phải → **Save Results As...** → Chọn định dạng CSV

---

## Cách 3: Sử dụng SQL Script chi tiết (In ra console)

Script SQL này in kết quả chi tiết ra console với định dạng dễ đọc.

### File: `backend/src/db/migrations/013_list_all_tables_and_columns.sql`

### Cách chạy:

1. Mở **SQL Server Management Studio (SSMS)**
2. Kết nối đến database
3. Mở file `013_list_all_tables_and_columns.sql`
4. Chạy (F5)

### Kết quả:

- In ra Messages tab với định dạng dễ đọc
- Bao gồm cả bảng CSV format ở cuối để copy

---

## So sánh các phương pháp

| Phương pháp | Ưu điểm | Nhược điểm | Phù hợp cho |
|------------|---------|------------|-------------|
| **TypeScript Script** | Tự động, có file output, format đẹp | Cần cài Node.js | Báo cáo tự động, tích hợp vào CI/CD |
| **SQL Script đơn giản** | Dễ export Excel, nhanh | Phải chạy thủ công | Export Excel, phân tích nhanh |
| **SQL Script chi tiết** | In đẹp, dễ đọc | Khó export | Xem nhanh, in ra giấy |

---

## Ví dụ sử dụng

### Tạo báo cáo hàng tuần:

```bash
# Thêm vào cron job hoặc scheduled task
npm run list-tables
```

### Export ra Excel để phân tích:

1. Chạy `014_simple_table_columns_report.sql` trong SSMS
2. Copy kết quả bảng 2 (Chi tiết tất cả các cột)
3. Dán vào Excel
4. Format và phân tích

### Kiểm tra nhanh cấu trúc:

Chạy query đơn giản:

```sql
SELECT 
    TABLE_NAME AS [Bảng],
    COUNT(*) AS [Số cột]
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME NOT LIKE 'sys%'
GROUP BY TABLE_NAME
ORDER BY TABLE_NAME;
```

---

## Lưu ý

- Tất cả các script đều tự động loại trừ các bảng hệ thống (sys%, MS_%)
- Script TypeScript cần kết nối database thành công (kiểm tra file `.env`)
- File báo cáo được lưu trong `backend/reports/` (tự động tạo nếu chưa có)


