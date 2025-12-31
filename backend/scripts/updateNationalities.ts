import fs from 'fs';
import path from 'path';
import { query, getPool } from '../src/db/sqlServer';

/**
 * Update player nationalities for demo purposes
 * - Changes most players to Vietnamese nationality
 * - Keeps 5 foreign players per team
 * 
 * Usage: npx ts-node scripts/updateNationalities.ts
 */

async function runNationalityUpdate() {
  console.log('🚀 Starting nationality update for demo...\n');

  const migrationPath = path.join(__dirname, '../src/db/migrations/009_update_nationalities_for_demo.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  try {
    console.log('📄 Reading migration file...');
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

    // Split by GO statements
    const statements = sqlContent
      .split(/^\s*GO\s*$/gim)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        try {
          const result = await query(statement);
          if (result.recordset && result.recordset.length > 0) {
            console.log('📊 Result:');
            console.table(result.recordset);
          } else if (result.rowsAffected && result.rowsAffected[0] > 0) {
            console.log(`   ✅ Rows affected: ${result.rowsAffected[0]}`);
          }
        } catch (stmtError: any) {
          // Skip PRINT statements that might cause issues
          if (stmtError.message?.includes('PRINT')) {
            console.log('   ℹ️  PRINT statement - continuing...');
            continue;
          }
          throw stmtError;
        }
      }
    }

    console.log('\n✅ Nationality update completed!\n');

    // Get summary
    console.log('📊 Final Summary:');
    const summary = await query(`
      SELECT 
        t.name AS team_name,
        COUNT(*) AS total_players,
        SUM(CASE WHEN p.nationality = N'Việt Nam' THEN 1 ELSE 0 END) AS vietnamese,
        SUM(CASE WHEN p.nationality <> N'Việt Nam' THEN 1 ELSE 0 END) AS foreign_players
      FROM players p
      INNER JOIN teams t ON p.current_team_id = t.team_id
      GROUP BY t.team_id, t.name
      ORDER BY t.name
    `);
    console.table(summary.recordset);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run the update
runNationalityUpdate()
  .then(() => {
    console.log('\n🎉 Process finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Process failed:', error);
    process.exit(1);
  });



