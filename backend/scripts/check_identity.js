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

    const result = await pool.request().query("SELECT COLUMNPROPERTY(OBJECT_ID('match_lineup_players'), 'lineup_player_id', 'IsIdentity') as is_identity");
    console.log("Is Identity:", result.recordset[0].is_identity);
    await pool.close();
}
run();
