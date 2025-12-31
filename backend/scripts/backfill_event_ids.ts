
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { query } from '../src/db/sqlServer';

async function backfill() {
    try {
        console.log('Backfilling player_id in match_events...');

        const result = await query(`
            UPDATE me
            SET me.player_id = spr.player_id
            FROM match_events me
            INNER JOIN season_player_registrations spr ON me.season_player_id = spr.season_player_id
            WHERE me.player_id IS NULL
        `);

        console.log(`Updated ${result.rowsAffected[0]} events with player_id.`);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

backfill();
