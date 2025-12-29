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
        const result = await pool.request().query("EXEC sp_help 'match_lineup_players'");
        // Result sets: 0=Name.., 1=Columns
        const columns = result.recordsets[1];
        console.log("COLUMNS:");
        columns.forEach(c => console.log(c.Column_name));
    } catch (e) { console.error(e); }
    await pool.close();
}
run();
