import { query } from '../src/db/sqlServer';

async function setVietnamesePlayers() {
    try {
        console.log('Setting 19 players per team to Vietnamese nationality...\n');

        const teams = [
            { id: 44, name: 'Công An Thành Phố Hồ Chí Minh' },
            { id: 45, name: 'Sông Lam Nghệ An' }
        ];

        for (const team of teams) {
            console.log(`\n=== Team: ${team.name} (ID: ${team.id}) ===`);

            // Get all players for this team
            const playersResult = await query<{
                player_id: number;
                full_name: string;
                nationality: string | null;
            }>(`
        SELECT player_id, full_name, nationality
        FROM players
        WHERE current_team_id = @teamId
        ORDER BY player_id
      `, { teamId: team.id });

            const players = playersResult.recordset;
            console.log(`Total players: ${players.length}`);

            // Take first 19 players and make them Vietnamese
            const vietnamesePlayers = players.slice(0, 19);
            const foreignPlayers = players.slice(19);

            console.log(`\nSetting as Vietnamese (${vietnamesePlayers.length}):`);
            for (const player of vietnamesePlayers) {
                console.log(`  - ${player.full_name}`);
                await query(`
          UPDATE players
          SET nationality = 'Vietnam'
          WHERE player_id = @playerId
        `, { playerId: player.player_id });
            }

            if (foreignPlayers.length > 0) {
                console.log(`\nRemaining as foreign (${foreignPlayers.length}):`);
                foreignPlayers.forEach(p => console.log(`  - ${p.full_name} (${p.nationality || 'NULL'})`));
            }

            // Verify final count
            const verifyResult = await query<{
                vietnamese: number;
                foreign: number;
                total: number;
            }>(`
        SELECT 
          SUM(CASE WHEN nationality IN ('Vietnam', 'Việt Nam', 'VN') THEN 1 ELSE 0 END) as vietnamese,
          SUM(CASE WHEN nationality NOT IN ('Vietnam', 'Việt Nam', 'VN') OR nationality IS NULL THEN 1 ELSE 0 END) as foreign,
          COUNT(*) as total
        FROM players
        WHERE current_team_id = @teamId
      `, { teamId: team.id });

            const counts = verifyResult.recordset[0];
            console.log(`\n✓ Final count: ${counts.vietnamese} Vietnamese, ${counts.foreign} Foreign (Total: ${counts.total})`);
        }

        console.log('\n✓ Successfully updated player nationalities!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

setVietnamesePlayers();
