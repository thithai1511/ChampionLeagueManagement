import { getOrFetchPlayerAvatar } from '../src/services/playerAvatarService';

/**
 * Test script to check if player avatar API is working
 * Usage: npx ts-node backend/scripts/testPlayerAvatarAPI.ts <playerId>
 */

async function testPlayerAvatar(playerId: number) {
  console.log('═'.repeat(60));
  console.log('🧪 TESTING PLAYER AVATAR API');
  console.log('═'.repeat(60));
  console.log(`Testing player ID: ${playerId}\n`);

  try {
    console.log('📡 Calling getOrFetchPlayerAvatar...');
    const avatarUrl = await getOrFetchPlayerAvatar(playerId);
    
    if (avatarUrl) {
      console.log(`✅ Success! Avatar URL: ${avatarUrl}`);
      console.log(`   URL length: ${avatarUrl.length} characters`);
      console.log(`   URL preview: ${avatarUrl.substring(0, 80)}...`);
    } else {
      console.log('❌ No avatar found for this player');
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Test completed');
    console.log('═'.repeat(60));
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Get player ID from command line argument
const playerIdArg = process.argv[2];
if (!playerIdArg) {
  console.error('❌ Please provide a player ID');
  console.log('Usage: npx ts-node backend/scripts/testPlayerAvatarAPI.ts <playerId>');
  process.exit(1);
}

const playerId = parseInt(playerIdArg, 10);
if (isNaN(playerId)) {
  console.error('❌ Invalid player ID. Must be a number');
  process.exit(1);
}

testPlayerAvatar(playerId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });


