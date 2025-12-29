require('dotenv').config();
const sql = require('mssql');

async function run() {
    const pool = await sql.connect({
        server: process.env.DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        options: { encrypt: true, trustServerCertificate: true }
    });

    try {
        await pool.request().query("ALTER TABLE match_lineup_players ADD is_substitute BIT DEFAULT 0");
        console.log("✅ Added column is_substitute successfully.");
    } catch (err) {
        console.log("ℹ " + err.message);
    }
    await pool.close();
}
run();
