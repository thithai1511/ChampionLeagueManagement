
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { query } from '../src/db/sqlServer';

async function unlockUsers() {
    try {
        console.log('Clearing all user lockouts...');

        const result = await query(`DELETE FROM user_session_lockouts`);

        console.log(`Unlocked ${result.rowsAffected[0]} users.`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

unlockUsers();
