/**
 * Script: Tự động duyệt đội hình cho các trận đã kết thúc
 * 
 * Mục đích: Chuẩn hóa dữ liệu cho các mùa cũ (đã nạp dữ liệu)
 * - Tìm tất cả các trận đã kết thúc
 * - Tự động approve tất cả lineup của các trận đó nếu chưa được approve
 * 
 * Usage: npx ts-node backend/scripts/auto_approve_finished_lineups.ts
 */

import fs from 'fs';
import path from 'path';
import { query } from '../src/db/sqlServer';

async function run() {
  console.log('🚀 Bắt đầu chuẩn hóa dữ liệu đội hình cho các trận đã kết thúc...\n');

  const migrationPath = path.join(__dirname, '../src/db/migrations/015_auto_approve_lineups_for_finished_matches.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Không tìm thấy file migration:', migrationPath);
    process.exit(1);
  }

  try {
    console.log('📄 Đang đọc file migration...');
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

    // Split by GO statements
    const statements = sqlContent
      .split(/^\s*GO\s*$/gim)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`📋 Tìm thấy ${statements.length} câu lệnh SQL để thực thi\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⏳ Đang thực thi câu lệnh ${i + 1}/${statements.length}...`);
        try {
          const result: any = await query(statement);
          
          // Handle result sets
          if (result.recordsets && result.recordsets.length > 0) {
            result.recordsets.forEach((recordset: any[], idx: number) => {
              if (recordset && recordset.length > 0) {
                console.log(`\n📊 Kết quả ${idx + 1}:`);
                console.table(recordset);
              }
            });
          }
          
          // Handle rows affected
          if (result.rowsAffected && result.rowsAffected.length > 0) {
            const totalAffected = result.rowsAffected.reduce((sum: number, arr: number[]) => 
              sum + (arr ? arr.reduce((a: number, b: number) => a + b, 0) : 0), 0
            );
            if (totalAffected > 0) {
              console.log(`   ✅ Đã cập nhật ${totalAffected} dòng`);
            }
          }
        } catch (stmtError: any) {
          // Skip PRINT statements that might cause issues
          if (stmtError.message?.includes('PRINT') || stmtError.message?.includes('Cannot find the object')) {
            console.log('   ℹ️  Bỏ qua câu lệnh PRINT hoặc biến tạm...');
            continue;
          }
          throw stmtError;
        }
      }
    }

    console.log('\n✅ Hoàn tất chuẩn hóa dữ liệu!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Lỗi khi thực thi migration:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

run();


