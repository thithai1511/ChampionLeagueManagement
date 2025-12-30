/*
  Script để liệt kê tất cả các bảng và thuộc tính trong database
  Mục đích: Tạo báo cáo về cấu trúc database
*/

SET NOCOUNT ON;

PRINT '=== BÁO CÁO CẤU TRÚC CƠ SỞ DỮ LIỆU ===';
PRINT 'Ngày tạo: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '';

-- Tổng số bảng
DECLARE @totalTables INT;
SELECT @totalTables = COUNT(*)
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME NOT LIKE 'sys%'
  AND TABLE_NAME NOT LIKE 'MS_%';

PRINT 'Tổng số bảng: ' + CAST(@totalTables AS VARCHAR(10));
PRINT '';

-- Danh sách tất cả các bảng với số cột và số dòng
PRINT '=== DANH SÁCH TẤT CẢ CÁC BẢNG ===';
PRINT '';

SELECT 
    t.TABLE_NAME AS [Tên bảng],
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_NAME = t.TABLE_NAME) AS [Số cột],
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
     INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc 
       ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
     WHERE kcu.TABLE_NAME = t.TABLE_NAME AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY') AS [Số khóa chính]
FROM INFORMATION_SCHEMA.TABLES t
WHERE t.TABLE_TYPE = 'BASE TABLE'
  AND t.TABLE_NAME NOT LIKE 'sys%'
  AND t.TABLE_NAME NOT LIKE 'MS_%'
ORDER BY t.TABLE_NAME;

PRINT '';
PRINT '=== CHI TIẾT TỪNG BẢNG ===';
PRINT '';

-- Tạo bảng tạm để lưu kết quả
CREATE TABLE #TableReport (
    TableName NVARCHAR(255),
    ColumnName NVARCHAR(255),
    DataType NVARCHAR(100),
    MaxLength INT,
    IsNullable NVARCHAR(10),
    ColumnDefault NVARCHAR(500),
    IsPrimaryKey BIT,
    IsForeignKey BIT,
    ForeignKeyTable NVARCHAR(255),
    ForeignKeyColumn NVARCHAR(255),
    OrdinalPosition INT
);

-- Lấy thông tin tất cả các bảng
DECLARE @tableName NVARCHAR(255);
DECLARE @sql NVARCHAR(MAX);

DECLARE table_cursor CURSOR FOR
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME NOT LIKE 'sys%'
  AND TABLE_NAME NOT LIKE 'MS_%'
ORDER BY TABLE_NAME;

OPEN table_cursor;
FETCH NEXT FROM table_cursor INTO @tableName;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @sql = '
    INSERT INTO #TableReport (TableName, ColumnName, DataType, MaxLength, IsNullable, ColumnDefault, IsPrimaryKey, IsForeignKey, ForeignKeyTable, ForeignKeyColumn, OrdinalPosition)
    SELECT 
        ''' + @tableName + ''' AS TableName,
        c.COLUMN_NAME AS ColumnName,
        c.DATA_TYPE AS DataType,
        c.CHARACTER_MAXIMUM_LENGTH AS MaxLength,
        c.IS_NULLABLE AS IsNullable,
        c.COLUMN_DEFAULT AS ColumnDefault,
        CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS IsPrimaryKey,
        CASE WHEN fk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS IsForeignKey,
        fk.REFERENCED_TABLE AS ForeignKeyTable,
        fk.REFERENCED_COLUMN AS ForeignKeyColumn,
        c.ORDINAL_POSITION AS OrdinalPosition
    FROM INFORMATION_SCHEMA.COLUMNS c
    LEFT JOIN (
        SELECT kcu.COLUMN_NAME, kcu.TABLE_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
        INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc 
            ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
        WHERE tc.CONSTRAINT_TYPE = ''PRIMARY KEY''
            AND kcu.TABLE_NAME = ''' + @tableName + '''
    ) pk ON c.COLUMN_NAME = pk.COLUMN_NAME AND c.TABLE_NAME = pk.TABLE_NAME
    LEFT JOIN (
        SELECT 
            kcu.COLUMN_NAME,
            kcu.TABLE_NAME,
            ccu.TABLE_NAME AS REFERENCED_TABLE,
            ccu.COLUMN_NAME AS REFERENCED_COLUMN
        FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
        INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
            ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        INNER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
            ON rc.UNIQUE_CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
        WHERE kcu.TABLE_NAME = ''' + @tableName + '''
    ) fk ON c.COLUMN_NAME = fk.COLUMN_NAME AND c.TABLE_NAME = fk.TABLE_NAME
    WHERE c.TABLE_NAME = ''' + @tableName + '''
    ORDER BY c.ORDINAL_POSITION;
    ';
    
    EXEC sp_executesql @sql;
    
    FETCH NEXT FROM table_cursor INTO @tableName;
END;

CLOSE table_cursor;
DEALLOCATE table_cursor;

-- Hiển thị kết quả theo từng bảng
DECLARE @currentTable NVARCHAR(255) = '';
DECLARE @prevTable NVARCHAR(255) = '';
DECLARE @ColumnName NVARCHAR(255);
DECLARE @DataType NVARCHAR(100);
DECLARE @MaxLength INT;
DECLARE @IsNullable NVARCHAR(10);
DECLARE @ColumnDefault NVARCHAR(500);
DECLARE @IsPrimaryKey BIT;
DECLARE @IsForeignKey BIT;
DECLARE @ForeignKeyTable NVARCHAR(255);
DECLARE @ForeignKeyColumn NVARCHAR(255);
DECLARE @OrdinalPosition INT;

DECLARE report_cursor CURSOR FOR
SELECT 
    TableName,
    ColumnName,
    DataType,
    MaxLength,
    IsNullable,
    ColumnDefault,
    IsPrimaryKey,
    IsForeignKey,
    ForeignKeyTable,
    ForeignKeyColumn,
    OrdinalPosition
FROM #TableReport
ORDER BY TableName, OrdinalPosition;

OPEN report_cursor;
FETCH NEXT FROM report_cursor INTO 
    @tableName, 
    @ColumnName, 
    @DataType, 
    @MaxLength, 
    @IsNullable, 
    @ColumnDefault, 
    @IsPrimaryKey, 
    @IsForeignKey, 
    @ForeignKeyTable, 
    @ForeignKeyColumn, 
    @OrdinalPosition;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF @currentTable <> @tableName
    BEGIN
        IF @prevTable <> ''
            PRINT '';
        
        PRINT '--- Bảng: ' + @tableName + ' ---';
        PRINT '';
        PRINT 'Cột | Kiểu dữ liệu | Nullable | Mặc định | PK | FK';
        PRINT REPLICATE('-', 100);
        
        SET @prevTable = @tableName;
        SET @currentTable = @tableName;
    END
    
    DECLARE @typeStr NVARCHAR(200) = @DataType;
    IF @MaxLength IS NOT NULL AND @MaxLength <> -1
        SET @typeStr = @typeStr + '(' + CAST(@MaxLength AS VARCHAR) + ')';
    ELSE IF @MaxLength = -1
        SET @typeStr = @typeStr + '(MAX)';
    
    DECLARE @nullableStr NVARCHAR(10) = CASE WHEN @IsNullable = 'YES' THEN 'Có' ELSE 'Không' END;
    DECLARE @defaultStr NVARCHAR(50) = ISNULL(@ColumnDefault, '-');
    DECLARE @pkStr NVARCHAR(5) = CASE WHEN @IsPrimaryKey = 1 THEN 'PK' ELSE '-' END;
    DECLARE @fkStr NVARCHAR(100) = CASE 
        WHEN @IsForeignKey = 1 THEN '→ ' + @ForeignKeyTable + '.' + @ForeignKeyColumn 
        ELSE '-' 
    END;
    
    PRINT @ColumnName + ' | ' + @typeStr + ' | ' + @nullableStr + ' | ' + @defaultStr + ' | ' + @pkStr + ' | ' + @fkStr;
    
    FETCH NEXT FROM report_cursor INTO 
        @tableName, 
        @ColumnName, 
        @DataType, 
        @MaxLength, 
        @IsNullable, 
        @ColumnDefault, 
        @IsPrimaryKey, 
        @IsForeignKey, 
        @ForeignKeyTable, 
        @ForeignKeyColumn, 
        @OrdinalPosition;
END;

CLOSE report_cursor;
DEALLOCATE report_cursor;

-- Xuất ra bảng tổng hợp dạng CSV
PRINT '';
PRINT '=== BẢNG TỔNG HỢP (CSV Format) ===';
PRINT '';
PRINT 'TableName,ColumnName,DataType,MaxLength,IsNullable,ColumnDefault,IsPrimaryKey,IsForeignKey,ForeignKeyTable,ForeignKeyColumn';

SELECT 
    TableName + ',' +
    ColumnName + ',' +
    DataType + ',' +
    ISNULL(CAST(MaxLength AS VARCHAR), 'NULL') + ',' +
    IsNullable + ',' +
    ISNULL(REPLACE(ColumnDefault, ',', ';'), 'NULL') + ',' +
    CAST(IsPrimaryKey AS VARCHAR) + ',' +
    CAST(IsForeignKey AS VARCHAR) + ',' +
    ISNULL(ForeignKeyTable, 'NULL') + ',' +
    ISNULL(ForeignKeyColumn, 'NULL')
FROM #TableReport
ORDER BY TableName, OrdinalPosition;

-- Tổng kết
PRINT '';
PRINT '=== TỔNG KẾT ===';
PRINT '';

SELECT 
    COUNT(DISTINCT TableName) AS [Tổng số bảng],
    COUNT(*) AS [Tổng số cột],
    SUM(CASE WHEN IsPrimaryKey = 1 THEN 1 ELSE 0 END) AS [Tổng số khóa chính],
    SUM(CASE WHEN IsForeignKey = 1 THEN 1 ELSE 0 END) AS [Tổng số khóa ngoại]
FROM #TableReport;

-- Dọn dẹp
DROP TABLE #TableReport;

PRINT '';
PRINT '=== HOÀN THÀNH ===';
GO

