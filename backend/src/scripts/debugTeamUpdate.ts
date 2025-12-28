import { query, getPool } from '../db/sqlServer';

async function debugTeamUpdate() {
  try {
    await getPool();
    
    console.log('\n=== CHECKING TEAM 28 DATA ===\n');
    
    // 1. Check current data
    const currentData = await query(`
      SELECT 
        team_id, name, code, city, country, founded_year,
        phone, email, stadium_name, stadium_capacity, website,
        description, status, updated_at
      FROM teams 
      WHERE team_id = 28
    `);
    
    console.log('📊 Current data in database:');
    console.log(JSON.stringify(currentData.recordset[0], null, 2));
    
    // 2. Try a simple update
    console.log('\n🔧 Attempting test update...');
    const updateResult = await query(`
      UPDATE teams 
      SET 
        phone = @phone,
        email = @email,
        stadium_name = @stadium_name,
        stadium_capacity = @stadium_capacity,
        website = @website,
        updated_at = GETDATE()
      WHERE team_id = @id
    `, {
      id: 28,
      phone: 'TEST-PHONE-12345',
      email: 'test@example.com',
      stadium_name: 'Test Stadium',
      stadium_capacity: 99999,
      website: 'https://test.com'
    });
    
    console.log('✅ Update executed, rows affected:', updateResult.rowsAffected[0]);
    
    // 3. Check data after update
    const afterUpdate = await query(`
      SELECT 
        team_id, name, code, city, country, founded_year,
        phone, email, stadium_name, stadium_capacity, website,
        description, status, updated_at
      FROM teams 
      WHERE team_id = 28
    `);
    
    console.log('\n📊 Data after test update:');
    console.log(JSON.stringify(afterUpdate.recordset[0], null, 2));
    
    // 4. Rollback test (put back original values if needed)
    console.log('\n✨ Debug complete!');
    
  } catch (error: any) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

debugTeamUpdate();

