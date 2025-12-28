import { query } from "../db/sqlServer";

async function checkTeam28() {
  try {
    console.log("🔍 Checking team 28 data in database...\n");

    const result = await query(`
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
        description,
        updated_at
      FROM teams
      WHERE team_id = 28;
    `);

    if (result.recordset.length === 0) {
      console.log("❌ Team 28 not found");
      return;
    }

    console.log("📊 Team 28 current data:");
    console.log(JSON.stringify(result.recordset[0], null, 2));
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

if (require.main === module) {
  checkTeam28()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("💥 Fatal error:", error);
      process.exit(1);
    });
}

export default checkTeam28;



