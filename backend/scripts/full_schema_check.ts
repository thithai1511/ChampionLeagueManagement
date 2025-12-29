import { query } from "../src/db/sqlServer";

async function run() {
    try {
        console.log("=== FULL SCHEMA OF season_player_registrations ===\n");

        const schema = await query(`
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_DEFAULT,
                CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'season_player_registrations'
            ORDER BY ORDINAL_POSITION
        `);

        console.log("All columns:\n");
        schema.recordset.forEach((c: any) => {
            const nullable = c.IS_NULLABLE === 'NO' ? '**REQUIRED**' : 'optional';
            const def = c.COLUMN_DEFAULT ? `DEFAULT: ${c.COLUMN_DEFAULT}` : 'NO DEFAULT';
            console.log(`${c.COLUMN_NAME.padEnd(35)} ${c.DATA_TYPE.padEnd(15)} ${nullable.padEnd(15)} ${def}`);
        });

        // Find required columns without defaults
        console.log("\n\n=== COLUMNS WE MUST PROVIDE (Required, No Default) ===\n");
        const required = schema.recordset.filter((c: any) =>
            c.IS_NULLABLE === 'NO' && (!c.COLUMN_DEFAULT || c.COLUMN_DEFAULT.trim() === '')
        );

        required.forEach((c: any) => {
            console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`);
        });

        // Check existing registrations from season 24/25
        console.log("\n\n=== SAMPLE FROM SEASON 24/25 (VL2425) ===\n");
        const sample = await query(`
            SELECT TOP 1 *
            FROM season_player_registrations spr
            JOIN seasons s ON spr.season_id = s.season_id
            WHERE s.code = 'VL2425'
        `);

        if (sample.recordset.length > 0) {
            const row = sample.recordset[0];
            console.log("Sample registration values:");
            Object.keys(row).forEach(key => {
                if (!key.includes('name') && !key.includes('description')) {
                    console.log(`  ${key}: ${row[key]}`);
                }
            });
        } else {
            console.log("No registrations found in season 24/25!");
        }

        process.exit(0);
    } catch (err: any) {
        console.error("Error:", err.message);
        process.exit(1);
    }
}

run();
