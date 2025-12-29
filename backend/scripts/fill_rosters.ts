
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { query } from '../src/db/sqlServer';

async function fillRosters() {
    try {
        console.log('Starting roster fill process...');

        // 1. Get current season ID (assume active season or latest)
        const seasonRes = await query(`SELECT top 1 season_id FROM seasons ORDER BY start_date DESC`);
        const seasonId = seasonRes.recordset[0]?.season_id;
        if (!seasonId) throw new Error('No season found');
        console.log(`Using Season ID: ${seasonId}`);

        // 2. Get teams with < 22 players
        const teamsRes = await query(`
            SELECT 
                t.team_id,
                t.name,
                COUNT(p.player_id) as current_count
            FROM teams t
            LEFT JOIN players p ON t.team_id = p.current_team_id
            GROUP BY t.team_id, t.name
            HAVING COUNT(p.player_id) < 22
        `);

        const teamsToFill = teamsRes.recordset;
        console.log(`Found ${teamsToFill.length} teams needing players.`);

        for (const team of teamsToFill) {
            const needed = 22 - team.current_count;
            console.log(`Adding ${needed} players to ${team.name} (ID: ${team.team_id})...`);

            for (let i = 1; i <= needed; i++) {
                const dummyName = `Player ${team.name.substring(0, 3)} ${i + team.current_count}`;

                // Insert into players
                const insertRes = await query(`
                    INSERT INTO players (full_name, nationality, current_team_id, created_at)
                    OUTPUT INSERTED.player_id
                    VALUES (@name, 'Vietnam', @teamId, SYSUTCDATETIME())
                `, { name: dummyName, teamId: team.team_id });

                const newPlayerId = insertRes.recordset[0].player_id;

                // Register for season
                await query(`
                    INSERT INTO season_player_registrations (season_id, player_id, season_team_id, status, created_at)
                    SELECT @seasonId, @playerId, stp.season_team_id, 'active', SYSUTCDATETIME()
                    FROM season_team_participants stp
                    WHERE stp.team_id = @teamId AND stp.season_id = @seasonId
                `, { seasonId, playerId: newPlayerId, teamId: team.team_id });
            }
        }

        console.log('Roster fill completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

fillRosters();
