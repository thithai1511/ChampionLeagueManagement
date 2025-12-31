import { promises as fs } from 'fs';
import path from 'path';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'LeagueManagement',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
    },
    authentication: process.env.DB_USER ? undefined : {
        type: 'default',
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
};

async function runSeedScript() {
    let pool: sql.ConnectionPool | null = null;

    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Connected to database');

        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'src', 'db', 'migrations', '010_seed_demo_statistics_2024_2025.sql');
        console.log(`📖 Reading SQL file: ${sqlFilePath}`);

        const sqlContent = await fs.readFile(sqlFilePath, 'utf-8');

        // Execute the SQL (note: batch execution for GO statements)
        console.log('🚀 Executing seed script...');
        console.log('⏳ This may take a few minutes...\n');

        const batches = sqlContent.split(/^\s*GO\s*$/gim);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim();
            if (batch.length > 0) {
                try {
                    const result = await pool.request().query(batch);
                    if (result.recordset && result.recordset.length > 0) {
                        console.table(result.recordset);
                    }
                } catch (error: any) {
                    // Some PRINT statements may cause errors, ignore them
                    if (!error.message?.includes('PRINT')) {
                        throw error;
                    }
                }
            }
        }

        console.log('\n✅ Seed script completed successfully!');

        // Display summary
        const summary = await pool.request().query(`
      SELECT 'Total Seasons' as Metric, COUNT(*) as Count FROM seasons
      UNION ALL SELECT 'Total Teams', COUNT(*) FROM teams
      UNION ALL SELECT 'Season 2024 Matches', COUNT(*) FROM matches m
        JOIN seasons s ON m.season_id = s.season_id
        WHERE s.name LIKE '%2024%'
      UNION ALL SELECT 'Season 2025 Matches', COUNT(*) FROM matches m
        JOIN seasons s ON m.season_id = s.season_id
        WHERE s.name LIKE '%2025%'
      UNION ALL SELECT 'Total Match Events', COUNT(*) FROM match_events
    `);

        console.log('\n📊 Database Summary:');
        console.table(summary.recordset);

    } catch (error) {
        console.error('❌ Error running seed script:', error);
        throw error;
    } finally {
        if (pool) {
            await pool.close();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the script
runSeedScript()
    .then(() => {
        console.log('\n🎉 All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Fatal error:', error);
        process.exit(1);
    });
