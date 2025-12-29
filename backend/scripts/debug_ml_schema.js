const { query } = require('../src/db/sqlServer');
require('dotenv').config();

async function run() {
    try {
        const res = await query("sp_help 'match_lineups'");
        // Result sets: 0=Name/Owner, 1=Columns
        const columns = res.recordsets[1];
        console.table(columns);
    } catch (err) {
        console.error(err);
    }
}

run();
