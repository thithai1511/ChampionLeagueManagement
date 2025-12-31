/**
 * Quick database connection test script
 * Run with: npx ts-node test-db-connection.ts
 */
import sql from "mssql";
import path from "path";
import { config as loadDotenv } from "dotenv";

// Load environment variables
loadDotenv({ path: path.resolve(process.cwd(), ".env") });

const config: sql.config = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASS || "",
  server: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME || "LeagueManagement",
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
    enableArithAbort: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

async function testConnection() {
  console.log("\n📊 Database Connection Test");
  console.log("================================");
  console.log(`Server: ${config.server}`);
  console.log(`Port: ${config.port}`);
  console.log(`Database: ${config.database}`);
  console.log(`User: ${config.user}`);
  console.log(`Encrypt: ${config.options?.encrypt}`);
  console.log(`Trust Server Certificate: ${config.options?.trustServerCertificate}`);
  console.log("================================\n");

  let pool: sql.ConnectionPool | null = null;

  try {
    console.log("⏳ Attempting to connect to database...");
    pool = new sql.ConnectionPool(config);
    await pool.connect();

    console.log("✅ Connection successful!\n");

    // Test query
    console.log("🔍 Testing with sample query...");
    const result = await pool.request().query("SELECT @@version AS version");
    console.log("✅ Query executed successfully!");
    console.log("SQL Server Version:", result.recordset[0].version);

    // Count tables
    console.log("\n📋 Checking tables...");
    const tableResult = await pool.request().query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'dbo'
    `);
    console.log(
      `✅ Database has ${tableResult.recordset[0].table_count} tables`
    );

    // List key tables
    console.log("\n📌 Key tables in database:");
    const keyTables = [
      "season_invitations",
      "season_team_registrations",
      "stadiums",
      "match_official_assignments",
      "match_reports",
      "player_of_match",
      "participation_fees",
      "disciplinary_records",
    ];

    const tableCheckResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = 'dbo' 
      AND TABLE_NAME IN ('${keyTables.join("','")}')
      ORDER BY TABLE_NAME
    `);

    if (tableCheckResult.recordset.length > 0) {
      console.log(`Found ${tableCheckResult.recordset.length} key tables:`);
      tableCheckResult.recordset.forEach((row: any) => {
        console.log(`  ✓ ${row.TABLE_NAME}`);
      });
    } else {
      console.log("⚠️  No key tables found - database may not be migrated yet");
    }

    console.log("\n✅ All connection tests passed!");
    process.exit(0);
  } catch (err: any) {
    console.error("\n❌ Connection failed!");
    console.error("Error:", err.message);

    if (err.code === "ELOGIN") {
      console.error(
        "\n🔐 Authentication Error: Check username/password in .env"
      );
    } else if (err.message?.includes("firewall")) {
      console.error(
        "\n🔥 Firewall Error: Your IP may not be whitelisted in Azure SQL Database"
      );
      console.error("Solution: Add your IP to Azure SQL firewall rules");
    } else if (err.code === "ETIMEDOUT" || err.message?.includes("timeout")) {
      console.error(
        "\n⏱️  Timeout Error: Cannot reach the database server"
      );
      console.error("Check: Server address, network connectivity, firewall");
    } else {
      console.error("\n🔧 Full error details:");
      console.error(err);
    }

    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

testConnection();
