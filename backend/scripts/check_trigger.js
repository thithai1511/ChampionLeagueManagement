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

    const result = await pool.request().query("SELECT name FROM sysobjects WHERE xtype = 'TR' AND parent_obj = OBJECT_ID('match_lineup_players')");
    console.log("Triggers:", result.recordset);
    await pool.close();
}
run();
