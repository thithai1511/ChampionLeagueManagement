
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { query } from '../src/db/sqlServer';

async function migrate() {
    try {
        console.log('Adding player_id and assist_player_id to match_events...');

        // Add player_id if not exists
        await query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'match_events' AND COLUMN_NAME = 'player_id')
            BEGIN
                ALTER TABLE match_events ADD player_id INT NULL;
                PRINT 'Added player_id column';
            END
        `);

        // Add assist_player_id if not exists
        await query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'match_events' AND COLUMN_NAME = 'assist_player_id')
            BEGIN
                ALTER TABLE match_events ADD assist_player_id INT NULL;
                PRINT 'Added assist_player_id column';
            END
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

migrate();
