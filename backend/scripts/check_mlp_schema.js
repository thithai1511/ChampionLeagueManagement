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

    const result = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'match_lineup_players'");
    console.log("Columns:");
    result.recordset.forEach(c => console.log("- " + c.COLUMN_NAME));
    await pool.close();
}
run();
