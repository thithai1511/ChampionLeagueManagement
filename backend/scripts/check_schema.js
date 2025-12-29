
const sql = require('mssql');
require('dotenv').config({ path: '.env' }); // Adjusted for CWD = backend

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

async function check() {
    try {
        await sql.connect(config);
        console.log("Connected to DB");

        const result = await sql.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'teams'");
        console.log("teams columns:", result.recordset.map(r => r.COLUMN_NAME));

        const result2 = await sql.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'FootballTeams'");
        console.log("FootballTeams columns:", result2.recordset.map(r => r.COLUMN_NAME));

    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}

check();
