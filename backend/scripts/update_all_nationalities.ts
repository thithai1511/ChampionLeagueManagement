
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { query } from '../src/db/sqlServer';

async function updateAllNationalities() {
    try {
        console.log('Updating ALL players to Vietnamese nationality...\n');

        // Update ALL players in the players table
        const result = await query(`
            UPDATE players
            SET nationality = 'Vietnam'
        `);

        console.log(`✓ Updated ${result.rowsAffected[0]} players to Vietnamese nationality`);

        // Verify a few random players
        const verifyResult = await query<{ full_name: string; nationality: string }>(`
            SELECT TOP 5 full_name, nationality 
            FROM players 
            ORDER BY NEWID()
        `);

        console.log('\nRandom Verification samples:');
        verifyResult.recordset.forEach(p => {
            console.log(`  ${p.full_name}: ${p.nationality}`);
        });

        console.log('\n✓ All players updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

updateAllNationalities();
