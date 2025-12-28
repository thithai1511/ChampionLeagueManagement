import { query } from "../db/sqlServer";

/**
 * Run migration to add contact and stadium columns to teams table
 */
async function runMigration() {
  try {
    console.log("🔧 Running migration: add team contact info columns...");

    // Add phone column
    try {
      await query(`
        IF COL_LENGTH('teams', 'phone') IS NULL
        BEGIN
          ALTER TABLE teams ADD phone VARCHAR(32) NULL;
          PRINT 'Added phone column';
        END
      `);
      console.log("✅ Phone column added/exists");
    } catch (e) {
      console.log("  Phone column already exists");
    }

    // Add email column
    try {
      await query(`
        IF COL_LENGTH('teams', 'email') IS NULL
        BEGIN
          ALTER TABLE teams ADD email VARCHAR(255) NULL;
          PRINT 'Added email column';
        END
      `);
      console.log("✅ Email column added/exists");
    } catch (e) {
      console.log("  Email column already exists");
    }

    // Add stadium_name column
    try {
      await query(`
        IF COL_LENGTH('teams', 'stadium_name') IS NULL
        BEGIN
          ALTER TABLE teams ADD stadium_name NVARCHAR(255) NULL;
          PRINT 'Added stadium_name column';
        END
      `);
      console.log("✅ Stadium name column added/exists");
    } catch (e) {
      console.log("  Stadium name column already exists");
    }

    // Add stadium_capacity column
    try {
      await query(`
        IF COL_LENGTH('teams', 'stadium_capacity') IS NULL
        BEGIN
          ALTER TABLE teams ADD stadium_capacity INT NULL CHECK (stadium_capacity >= 0);
          PRINT 'Added stadium_capacity column';
        END
      `);
      console.log("✅ Stadium capacity column added/exists");
    } catch (e) {
      console.log("  Stadium capacity column already exists");
    }

    // Add website column
    try {
      await query(`
        IF COL_LENGTH('teams', 'website') IS NULL
        BEGIN
          ALTER TABLE teams ADD website VARCHAR(255) NULL;
          PRINT 'Added website column';
        END
      `);
      console.log("✅ Website column added/exists");
    } catch (e) {
      console.log("  Website column already exists");
    }

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log("✨ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Fatal error:", error);
      process.exit(1);
    });
}

export default runMigration;

