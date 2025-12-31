
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { calculateStandings } from '../src/services/standingsAdminService';
import { query } from '../src/db/sqlServer';

async function triggerCalc() {
    try {
        const matches = await query(`SELECT top 1 season_id FROM matches WHERE status='completed'`);
        const seasonId = matches.recordset[0]?.season_id;
        if (!seasonId) { console.log('No season found'); process.exit(0); }

        console.log(`Calculating for season ${seasonId}...`);
        await calculateStandings(seasonId);
        console.log('Calculation done.');

        const stats = await query(`SELECT count(*) as cnt FROM season_team_statistics WHERE season_id = @seasonId AND matches_played > 0`, { seasonId });
        console.log(`Teams with matches_played > 0: ${stats.recordset[0].cnt}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

triggerCalc();
