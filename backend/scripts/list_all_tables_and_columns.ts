import { query } from "../src/db/sqlServer";
import * as fs from "fs";
import * as path from "path";

interface ColumnInfo {
  columnName: string;
  dataType: string;
  maxLength: number | null;
  isNullable: string;
  columnDefault: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyTable: string | null;
  foreignKeyColumn: string | null;
  ordinalPosition: number;
}

interface TableInfo {
  tableName: string;
  columns: ColumnInfo[];
  rowCount: number;
}

async function getAllTables(): Promise<string[]> {
  const result = await query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME NOT LIKE 'sys%'
      AND TABLE_NAME NOT LIKE 'MS_%'
    ORDER BY TABLE_NAME
  `);
  
  return result.recordset.map((row: any) => row.TABLE_NAME);
}

async function getTableColumns(tableName: string): Promise<ColumnInfo[]> {
  // Get basic column information
  const columnsResult = await query(`
    SELECT 
      c.COLUMN_NAME,
      c.DATA_TYPE,
      c.CHARACTER_MAXIMUM_LENGTH,
      c.IS_NULLABLE,
      c.COLUMN_DEFAULT,
      c.ORDINAL_POSITION
    FROM INFORMATION_SCHEMA.COLUMNS c
    WHERE c.TABLE_NAME = @tableName
    ORDER BY c.ORDINAL_POSITION
  `, { tableName });

  const columns: ColumnInfo[] = columnsResult.recordset.map((col: any) => ({
    columnName: col.COLUMN_NAME,
    dataType: col.DATA_TYPE,
    maxLength: col.CHARACTER_MAXIMUM_LENGTH,
    isNullable: col.IS_NULLABLE,
    columnDefault: col.COLUMN_DEFAULT,
    isPrimaryKey: false,
    isForeignKey: false,
    foreignKeyTable: null,
    foreignKeyColumn: null,
    ordinalPosition: col.ORDINAL_POSITION,
  }));

  // Get primary key information
  const pkResult = await query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_NAME = @tableName
      AND CONSTRAINT_NAME IN (
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_NAME = @tableName
          AND CONSTRAINT_TYPE = 'PRIMARY KEY'
      )
  `, { tableName });

  const pkColumns = new Set(
    pkResult.recordset.map((row: any) => row.COLUMN_NAME)
  );

  // Get foreign key information
  const fkResult = await query(`
    SELECT 
      kcu.COLUMN_NAME,
      ccu.TABLE_NAME AS REFERENCED_TABLE,
      ccu.COLUMN_NAME AS REFERENCED_COLUMN
    FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
    INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    INNER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
      ON rc.UNIQUE_CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
    WHERE kcu.TABLE_NAME = @tableName
  `, { tableName });

  const fkMap = new Map<string, { table: string; column: string }>();
  fkResult.recordset.forEach((row: any) => {
    fkMap.set(row.COLUMN_NAME, {
      table: row.REFERENCED_TABLE,
      column: row.REFERENCED_COLUMN,
    });
  });

  // Update columns with PK and FK information
  columns.forEach((col) => {
    col.isPrimaryKey = pkColumns.has(col.columnName);
    const fkInfo = fkMap.get(col.columnName);
    if (fkInfo) {
      col.isForeignKey = true;
      col.foreignKeyTable = fkInfo.table;
      col.foreignKeyColumn = fkInfo.column;
    }
  });

  return columns;
}

async function getTableRowCount(tableName: string): Promise<number> {
  try {
    const result = await query(`SELECT COUNT(*) as count FROM [${tableName}]`);
    return result.recordset[0]?.count || 0;
  } catch (error) {
    return 0;
  }
}

function formatDataType(col: ColumnInfo): string {
  let type = col.dataType.toUpperCase();
  if (col.maxLength !== null && col.maxLength !== -1) {
    if (type === "NVARCHAR" || type === "VARCHAR" || type === "CHAR" || type === "NCHAR") {
      type += `(${col.maxLength})`;
    }
  } else if (col.maxLength === -1) {
    type += "(MAX)";
  }
  return type;
}

function generateMarkdownReport(tables: TableInfo[]): string {
  let md = "# BÁO CÁO CẤU TRÚC CƠ SỞ DỮ LIỆU\n\n";
  md += `**Ngày tạo:** ${new Date().toLocaleString("vi-VN")}\n\n`;
  md += `**Tổng số bảng:** ${tables.length}\n\n`;
  md += `**Tổng số cột:** ${tables.reduce((sum, t) => sum + t.columns.length, 0)}\n\n`;
  md += `**Tổng số dòng dữ liệu:** ${tables.reduce((sum, t) => sum + t.rowCount, 0).toLocaleString("vi-VN")}\n\n`;
  md += "---\n\n";

  tables.forEach((table) => {
    md += `## 📊 Bảng: \`${table.tableName}\`\n\n`;
    md += `**Số cột:** ${table.columns.length} | **Số dòng:** ${table.rowCount.toLocaleString("vi-VN")}\n\n`;
    md += "| Tên cột | Kiểu dữ liệu | Nullable | Mặc định | Khóa chính | Khóa ngoại |\n";
    md += "|---------|--------------|----------|----------|------------|------------|\n";

    table.columns.forEach((col) => {
      const dataType = formatDataType(col);
      const nullable = col.isNullable === "YES" ? "✅ Có" : "❌ Không";
      const defaultValue = col.columnDefault ? `\`${col.columnDefault}\`` : "-";
      const pk = col.isPrimaryKey ? "🔑 PK" : "-";
      const fk = col.isForeignKey
        ? `🔗 → ${col.foreignKeyTable}.${col.foreignKeyColumn}`
        : "-";

      md += `| \`${col.columnName}\` | ${dataType} | ${nullable} | ${defaultValue} | ${pk} | ${fk} |\n`;
    });

    md += "\n";
  });

  return md;
}

function generateJsonReport(tables: TableInfo[]): any {
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalTables: tables.length,
      totalColumns: tables.reduce((sum, t) => sum + t.columns.length, 0),
      totalRows: tables.reduce((sum, t) => sum + t.rowCount, 0),
    },
    tables: tables.map((table) => ({
      tableName: table.tableName,
      rowCount: table.rowCount,
      columnCount: table.columns.length,
      columns: table.columns.map((col) => ({
        columnName: col.columnName,
        dataType: formatDataType(col),
        isNullable: col.isNullable === "YES",
        columnDefault: col.columnDefault,
        isPrimaryKey: col.isPrimaryKey,
        isForeignKey: col.isForeignKey,
        foreignKeyReference: col.isForeignKey
          ? {
              table: col.foreignKeyTable,
              column: col.foreignKeyColumn,
            }
          : null,
        ordinalPosition: col.ordinalPosition,
      })),
    })),
  };
}

async function main() {
  try {
    console.log("🔍 Đang lấy danh sách các bảng...");
    const tableNames = await getAllTables();
    console.log(`✅ Tìm thấy ${tableNames.length} bảng\n`);

    const tables: TableInfo[] = [];

    for (let i = 0; i < tableNames.length; i++) {
      const tableName = tableNames[i];
      console.log(`[${i + 1}/${tableNames.length}] Đang xử lý bảng: ${tableName}...`);

      const columns = await getTableColumns(tableName);
      const rowCount = await getTableRowCount(tableName);

      tables.push({
        tableName,
        columns,
        rowCount,
      });
    }

    console.log("\n✅ Hoàn thành! Đang tạo báo cáo...\n");

    // Generate reports
    const jsonReport = generateJsonReport(tables);
    const markdownReport = generateMarkdownReport(tables);

    // Save reports
    const outputDir = path.join(__dirname, "../reports");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const jsonPath = path.join(outputDir, `database_schema_${timestamp}.json`);
    const mdPath = path.join(outputDir, `database_schema_${timestamp}.md`);

    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), "utf-8");
    fs.writeFileSync(mdPath, markdownReport, "utf-8");

    console.log("📄 Báo cáo đã được lưu:");
    console.log(`   - JSON: ${jsonPath}`);
    console.log(`   - Markdown: ${mdPath}\n`);

    // Print summary to console
    console.log("=".repeat(60));
    console.log("TÓM TẮT");
    console.log("=".repeat(60));
    console.log(`Tổng số bảng: ${tables.length}`);
    console.log(`Tổng số cột: ${tables.reduce((sum, t) => sum + t.columns.length, 0)}`);
    console.log(`Tổng số dòng: ${tables.reduce((sum, t) => sum + t.rowCount, 0).toLocaleString("vi-VN")}`);
    console.log("=".repeat(60));
    console.log("\nDanh sách bảng:");
    tables.forEach((table) => {
      console.log(
        `  - ${table.tableName.padEnd(40)} ${table.columns.length.toString().padStart(3)} cột, ${table.rowCount.toLocaleString("vi-VN").padStart(10)} dòng`
      );
    });

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Lỗi:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();



