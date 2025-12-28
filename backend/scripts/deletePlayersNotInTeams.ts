import { query } from '../src/db/sqlServer';

/**
 * Script to delete all players that don't belong to the current teams
 * Usage: npx ts-node backend/scripts/deletePlayersNotInTeams.ts
 */

interface Team {
  team_id: number;
  name: string;
}

interface Player {
  player_id: number;
  full_name: string;
  current_team_id: number | null;
  team_name: string | null;
}

async function getCurrentTeams(): Promise<Team[]> {
  console.log('📋 Fetching current teams...');
  const result = await query<Team>(
    `SELECT team_id, name FROM teams ORDER BY name;`
  );
  const teams = result.recordset;
  console.log(`✅ Found ${teams.length} teams:`);
  teams.forEach(team => {
    console.log(`   • ${team.name} (ID: ${team.team_id})`);
  });
  return teams;
}

async function getPlayersToDelete(validTeamIds: number[]): Promise<Player[]> {
  console.log('\n🔍 Finding players to delete...');
  
  if (validTeamIds.length === 0) {
    console.log('⚠️  No valid teams found. This will delete ALL players!');
    const result = await query<Player>(
      `SELECT 
        p.player_id,
        p.full_name,
        p.current_team_id,
        t.name as team_name
      FROM players p
      LEFT JOIN teams t ON p.current_team_id = t.team_id
      ORDER BY p.full_name;`
    );
    return result.recordset;
  }
  
  // Build IN clause - validate all IDs are numbers
  const teamIdsStr = validTeamIds
    .filter(id => Number.isInteger(id) && id > 0)
    .join(',');
  
  if (teamIdsStr === '') {
    // No valid team IDs, return all players
    const result = await query<Player>(
      `SELECT 
        p.player_id,
        p.full_name,
        p.current_team_id,
        t.name as team_name
      FROM players p
      LEFT JOIN teams t ON p.current_team_id = t.team_id
      ORDER BY p.full_name;`
    );
    return result.recordset;
  }
  
  const result = await query<Player>(
    `SELECT 
      p.player_id,
      p.full_name,
      p.current_team_id,
      t.name as team_name
    FROM players p
    LEFT JOIN teams t ON p.current_team_id = t.team_id
    WHERE p.current_team_id IS NULL 
       OR p.current_team_id NOT IN (${teamIdsStr})
    ORDER BY p.full_name;`
  );
  
  return result.recordset;
}

async function deletePlayers(playerIds: number[]): Promise<number> {
  if (playerIds.length === 0) {
    return 0;
  }
  
  console.log(`\n🗑️  Deleting ${playerIds.length} players...`);
  
  // Delete in batches to avoid SQL parameter limits
  const batchSize = 1000;
  let totalDeleted = 0;
  
  for (let i = 0; i < playerIds.length; i += batchSize) {
    const batch = playerIds
      .slice(i, i + batchSize)
      .filter(id => Number.isInteger(id) && id > 0);
    
    if (batch.length === 0) continue;
    
    const playerIdsStr = batch.join(',');
    
    const result = await query<{ rowsAffected: number }>(
      `DELETE FROM players 
       WHERE player_id IN (${playerIdsStr});`
    );
    
    const deleted = result.rowsAffected?.[0] ?? 0;
    totalDeleted += deleted;
    console.log(`   ✅ Deleted batch ${Math.floor(i / batchSize) + 1}: ${deleted} players`);
  }
  
  return totalDeleted;
}

async function getTotalPlayers(): Promise<number> {
  const result = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM players;`
  );
  return result.recordset[0]?.count ?? 0;
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🗑️  DELETE PLAYERS NOT IN CURRENT TEAMS');
  console.log('═'.repeat(60));
  
  try {
    // Get current teams
    const teams = await getCurrentTeams();
    const validTeamIds = teams.map(t => t.team_id);
    
    if (validTeamIds.length === 0) {
      console.log('\n⚠️  WARNING: No teams found in database!');
      console.log('   This script will delete ALL players.');
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Get total players before
    const totalBefore = await getTotalPlayers();
    console.log(`\n📊 Total players in database: ${totalBefore}`);
    
    // Get players to delete
    const playersToDelete = await getPlayersToDelete(validTeamIds);
    
    if (playersToDelete.length === 0) {
      console.log('\n✅ No players to delete. All players belong to current teams.');
      return;
    }
    
    // Show players to be deleted
    console.log(`\n⚠️  Found ${playersToDelete.length} players to delete:`);
    console.log('\nPlayers to be deleted:');
    playersToDelete.forEach((player, idx) => {
      const teamInfo = player.team_name 
        ? `(${player.team_name})` 
        : '(No team)';
      console.log(`   ${idx + 1}. ${player.full_name} ${teamInfo} [ID: ${player.player_id}]`);
    });
    
    // Group by team for summary
    const byTeam = playersToDelete.reduce((acc, player) => {
      const key = player.team_name || 'No Team';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📊 Summary by team:');
    Object.entries(byTeam).forEach(([team, count]) => {
      console.log(`   • ${team}: ${count} players`);
    });
    
    // Confirm deletion
    console.log('\n' + '═'.repeat(60));
    console.log(`⚠️  WARNING: This will delete ${playersToDelete.length} players!`);
    console.log('═'.repeat(60));
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Delete players
    const playerIds = playersToDelete.map(p => p.player_id);
    const deletedCount = await deletePlayers(playerIds);
    
    // Get total players after
    const totalAfter = await getTotalPlayers();
    
    // Final summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 FINAL SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total players before: ${totalBefore}`);
    console.log(`Players deleted: ${deletedCount}`);
    console.log(`Total players after: ${totalAfter}`);
    console.log(`✅ Script completed successfully!`);
    console.log('═'.repeat(60));
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run script
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
