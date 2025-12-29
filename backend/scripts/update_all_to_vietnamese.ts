import { query } from '../src/db/sqlServer';

async function updateToVietnamese() {
    try {
        console.log('Updating players to Vietnamese nationality...\n');

        // Update all players from teams 44 and 45 to Vietnamese
        const result = await query(`
      UPDATE players
      SET nationality = 'Vietnam'
      WHERE current_team_id IN (44, 45)
    `);

        console.log(`✓ Updated ${result.rowsAffected[0]} players to Vietnamese nationality`);

        // Verify
        const verifyResult = await query<{ team_id: number; team_name: string; vietnamese: number; foreign: number }>(`
      SELECT 
        t.team_id,
        t.name as team_name,
        SUM(CASE WHEN p.nationality = 'Vietnam' THEN 1 ELSE 0 END) as vietnamese,
        SUM(CASE WHEN p.nationality != 'Vietnam' OR p.nationality IS NULL THEN 1 ELSE 0 END) as foreign
      FROM teams t
      LEFT JOIN players p ON t.team_id = p.current_team_id
      WHERE t.team_id IN (44, 45)
      GROUP BY t.team_id, t.name
    `);

        console.log('\nTeam breakdown:');
        verifyResult.recordset.forEach(team => {
            console.log(`  ${team.team_name}: ${team.vietnamese} Vietnamese, ${team.foreign} Foreign`);
        });

        console.log('\n✓ All players are now Vietnamese!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

updateToVietnamese();
