
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { query } from '../src/db/sqlServer';

async function fillRostersSafe() {
    try {
        console.log('Starting SAFE roster fill process...');

        const seasonRes = await query(`SELECT top 1 season_id FROM seasons ORDER BY start_date DESC`);
        const seasonId = seasonRes.recordset[0]?.season_id;
        if (!seasonId) throw new Error('No season found');
        console.log(`Using Season ID: ${seasonId}`);

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
            // First, find if this team is in the season
            const stpRes = await query(`
                SELECT season_team_id 
                FROM season_team_participants 
                WHERE team_id = @teamId AND season_id = @seasonId
            `, { teamId: team.team_id, seasonId });

            let seasonTeamId = stpRes.recordset[0]?.season_team_id;

            if (!seasonTeamId) {
                console.log(`Team ${team.name} (ID: ${team.team_id}) is NOT in Season ${seasonId}. Skipping registration, solely adding to players table.`);
                // We still populate players table so they have a roster, 
                // but we skip season registration to avoid FK error.
            } else {
                console.log(`Team ${team.name} has SeasonTeamID: ${seasonTeamId}`);
            }

            const needed = 22 - team.current_count;
            console.log(`Adding ${needed} players to ${team.name}...`);

            for (let i = 1; i <= needed; i++) {
                const dummyName = `Player ${team.name.substring(0, 3)} ${i + team.current_count}`;

                // Insert into players
                const insertRes = await query(`
                    INSERT INTO players (full_name, nationality, current_team_id, date_of_birth, preferred_position, created_at)
                    OUTPUT INSERTED.player_id
                    VALUES (@name, 'Vietnam', @teamId, '2000-01-01', 'MF', SYSUTCDATETIME())
                `, { name: dummyName, teamId: team.team_id });

                const newPlayerId = insertRes.recordset[0].player_id;

                if (seasonTeamId) {
                    try {
                        await query(`
                            INSERT INTO season_player_registrations (season_id, player_id, season_team_id, status, created_at)
                            VALUES (@seasonId, @playerId, @seasonTeamId, 'active', SYSUTCDATETIME())
                        `, { seasonId, playerId: newPlayerId, seasonTeamId });
                    } catch (regErr) {
                        console.warn(`Failed to register player ${newPlayerId} for season:`, regErr);
                    }
                }
            }
        }

        console.log('Roster fill completed.');
        process.exit(0);
    } catch (err: any) {
        console.error('SHORT ERROR MSG:', err.message);
        console.error('SQL STATE:', err.number);
        process.exit(1);
    }
}

fillRostersSafe();
