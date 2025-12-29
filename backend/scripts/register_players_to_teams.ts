import { query } from '../src/db/sqlServer';

async function registerPlayersToTeams() {
    try {
        console.log('Starting to register players to their teams...\n');

        const seasonId = 9; // Current season

        // Get all teams from the match
        const teamsResult = await query<{ team_id: number; team_name: string; season_team_id: number }>(`
      SELECT DISTINCT t.team_id, t.name as team_name, stp.season_team_id
      FROM teams t
      INNER JOIN season_team_participants stp ON t.team_id = stp.team_id
      WHERE stp.season_id = @seasonId
      AND t.team_id IN (44, 45)
    `, { seasonId });

        for (const team of teamsResult.recordset) {
            console.log(`\n=== Team: ${team.team_name} (ID: ${team.team_id}, SeasonTeamID: ${team.season_team_id}) ===`);

            // Get all players for this team
            const playersResult = await query<{
                player_id: number;
                full_name: string;
            }>(`
        SELECT player_id, full_name
        FROM players
        WHERE current_team_id = @teamId
      `, { teamId: team.team_id });

            console.log(`Found ${playersResult.recordset.length} players`);

            // Register each player
            for (const player of playersResult.recordset) {
                // Check if already registered
                const existingResult = await query(`
          SELECT registration_id
          FROM season_player_registrations
          WHERE season_id = @seasonId
          AND season_team_id = @seasonTeamId
          AND player_id = @playerId
        `, {
                    seasonId,
                    seasonTeamId: team.season_team_id,
                    playerId: player.player_id
                });

                if (existingResult.recordset.length === 0) {
                    // Insert registration
                    await query(`
            INSERT INTO season_player_registrations (
              season_id,
              season_team_id,
              player_id,
              registration_status,
              created_at,
              updated_at
            ) VALUES (
              @seasonId,
              @seasonTeamId,
              @playerId,
              'APPROVED',
              GETDATE(),
              GETDATE()
            )
          `, {
                        seasonId,
                        seasonTeamId: team.season_team_id,
                        playerId: player.player_id
                    });

                    console.log(`  ✓ Registered: ${player.full_name}`);
                } else {
                    console.log(`  - Already registered: ${player.full_name}`);
                }
            }

            // Verify count
            const countResult = await query<{ player_count: number }>(`
        SELECT COUNT(*) as player_count
        FROM season_player_registrations
        WHERE season_id = @seasonId
        AND season_team_id = @seasonTeamId
        AND registration_status = 'APPROVED'
      `, {
                seasonId,
                seasonTeamId: team.season_team_id
            });

            console.log(`Total registered players: ${countResult.recordset[0].player_count}`);
        }

        console.log('\n✓ All players registered successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

registerPlayersToTeams();
