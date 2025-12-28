import { query } from '../src/db/sqlServer';

/**
 * Add avatar_url column to FootballPlayers table if it doesn't exist
 */
async function addAvatarUrlColumn() {
  console.log('═'.repeat(60));
  console.log('🔧 ADDING avatar_url COLUMN TO FootballPlayers');
  console.log('═'.repeat(60));

  try {
    // Check if column exists
    const checkResult = await query<{ column_exists: number }>(
      `SELECT COUNT(*) as column_exists
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'dbo' 
         AND TABLE_NAME = 'FootballPlayers' 
         AND COLUMN_NAME = 'avatar_url';`
    );

    const columnExists = checkResult.recordset[0]?.column_exists > 0;

    if (columnExists) {
      console.log('✅ Column avatar_url already exists in FootballPlayers table');
      return;
    }

    // Add column
    console.log('📝 Adding avatar_url column...');
    await query(
      `ALTER TABLE dbo.FootballPlayers
       ADD avatar_url NVARCHAR(1024) NULL;`
    );

    console.log('✅ Successfully added avatar_url column to FootballPlayers table');
    console.log('═'.repeat(60));
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

if (require.main === module) {
  addAvatarUrlColumn()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}


