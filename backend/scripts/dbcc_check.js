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
        console.log("Attempting DBCC CHECKIDENT...");
        await pool.request().query("DBCC CHECKIDENT ('match_lineup_players', RESEED, 0)");
        console.log("✅ DBCC CHECKIDENT success. It IS an Identity column.");
    } catch (e) {
        console.log("❌ DBCC Failed: " + e.message);
    }
    await pool.close();
}
run();
