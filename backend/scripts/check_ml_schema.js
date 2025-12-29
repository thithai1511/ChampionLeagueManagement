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

    const result = await pool.request().query("SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'match_lineups'");
    console.log("Columns:");
    const fs = require('fs');
    const lines = result.recordset.map(c => `${c.COLUMN_NAME} | Nullable: ${c.IS_NULLABLE} | Default: ${c.COLUMN_DEFAULT}`);
    fs.writeFileSync('scripts/schema_output.txt', lines.join('\n'));
    await pool.close();
}
run();
