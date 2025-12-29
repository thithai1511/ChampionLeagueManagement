
const path = require('path');
const dotenvPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: dotenvPath });

console.log("Loading .env from:", dotenvPath);
console.log("DB_SERVER:", process.env.DB_SERVER ? "Defined" : "Undefined");
console.log("DB_USER:", process.env.DB_USER ? "Defined" : "Undefined");
console.log("DB_NAME:", process.env.DB_NAME ? "Defined" : "Undefined");

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function checkTeamPlayers() {
    try {
        await sql.connect(config);
        console.log("Connected to DB. Checking player counts per team...");

        // Query to count players for each team using FootballPlayers table
        // We group by team_name which is stored in FootballPlayers
        const result = await sql.query(`
            SELECT 
                COALESCE(t.name, p.team_name, 'Unknown Team') as team_name,
                COUNT(p.id) as player_count
            FROM dbo.FootballTeams t
            LEFT JOIN dbo.FootballPlayers p ON t.external_id = p.team_external_id
            GROUP BY COALESCE(t.name, p.team_name, 'Unknown Team')
            ORDER BY player_count ASC
        `);

        console.log("\n--- TEAM PLAYER COUNTS ---");
        if (result.recordset.length === 0) {
            console.log("No teams found or no player data available.");
        } else {
            result.recordset.forEach(row => {
                console.log(`${row.team_name}: ${row.player_count} players`);
            });
        }

        // Also check if there are any players with internal_team_id set but no external_id (manual players)
        const manualPlayers = await sql.query(`
            SELECT COUNT(*) as count FROM dbo.FootballPlayers WHERE is_manual = 1
        `);
        console.log(`\nTotal Manual Players: ${manualPlayers.recordset[0].count}`);

    } catch (err) {
        console.error("Error executing query:", err);
    } finally {
        await sql.close();
    }
}

checkTeamPlayers();
