import { query } from "../db/sqlServer";

/**
 * Test script to check if columns exist and have data
 */
async function testTeamColumns() {
  try {
    console.log("🔍 Testing teams table columns...");

    // Check if columns exist
    const columnsResult = await query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'teams' 
        AND COLUMN_NAME IN ('phone', 'email', 'stadium_name', 'stadium_capacity')
      ORDER BY COLUMN_NAME;
    `);

    console.log("\n📋 Column definitions:");
    console.table(columnsResult.recordset);

    // Check data in team 28
    const teamResult = await query(`
      SELECT 
        team_id,
        name,
        code,
        city,
        country,
        founded_year,
        phone,
        email,
        stadium_name,
        stadium_capacity,
        website,
        description
      FROM teams
      WHERE team_id = 28;
    `);

    console.log("\n📊 Team 28 data:");
    console.log(JSON.stringify(teamResult.recordset[0], null, 2));

    console.log("\n✅ Test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  testTeamColumns()
    .then(() => {
      console.log("✨ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Fatal error:", error);
      process.exit(1);
    });
}

export default testTeamColumns;



