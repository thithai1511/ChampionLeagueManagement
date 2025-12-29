import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== REDISTRIBUTING PLAYERS EVENLY ===\n");

    try {
        const seasonId = 9;

        // 1. Delete all registrations
        console.log("1. Clearing all registrations...");
        await query(`DELETE FROM season_player_registrations WHERE season_id = @seasonId`, { seasonId });
        console.log("✓ Cleared\n");

        // 2. Get all teams
        const teamsRes = await query<{ season_team_id: number, team_id: number, name: string }>(`
            SELECT stp.season_team_id, stp.team_id, t.name
            FROM season_team_participants stp
            JOIN teams t ON stp.team_id = t.team_id
            WHERE stp.season_id = @seasonId
            ORDER BY t.name
        `, { seasonId });

        const teams = teamsRes.recordset;
        console.log(`2. Found ${teams.length} teams\n`);

        // 3. Get ALL available players (not tied to any specific team in FootballPlayers)
        const allPlayersRes = await query<{ id: number, name: string, position: string, date_of_birth: any }>(`
            SELECT TOP 374
                id, name, position, date_of_birth
            FROM FootballPlayers
            WHERE id IS NOT NULL
            ORDER BY NEWID()  -- Random order
        `);

        const allPlayers = allPlayersRes.recordset;
        console.log(`3. Got ${allPlayers.length} total players\n`);

        // 4. Distribute evenly - 22 players per team
        console.log("4. Distributing evenly (22 per team)...\n");

        const playersPerTeam = 22;
        let playerIndex = 0;
        let totalRegistered = 0;

        for (const team of teams) {
            console.log(`${team.name}...`);
            let teamCount = 0;

            // Assign 22 players to this team
            for (let i = 0; i < playersPerTeam && playerIndex < allPlayers.length; i++) {
                const player = allPlayers[playerIndex++];

                try {
                    //Calculate age
                    let age = 25;
                    if (player.date_of_birth) {
                        const dob = new Date(player.date_of_birth);
                        const seasonStart = new Date('2025-08-01');
                        age = seasonStart.getFullYear() - dob.getFullYear();
                        if (age < 16) age = 16;
                        if (age > 40) age = 40;
                    }

                    await query(`
                        INSERT INTO season_player_registrations (
                            season_id,
                            season_team_id,
                            player_id,
                            player_type,
                            age_on_season_start,
                            registration_status
                        ) VALUES (
                            @seasonId,
                            @seasonTeamId,
                            @playerId,
                            'domestic',
                            @age,
                            'approved'
                        )
                    `, {
                        seasonId,
                        seasonTeamId: team.season_team_id,
                        playerId: player.id,
                        age
                    });

                    teamCount++;
                    totalRegistered++;
                } catch (err: any) {
                    console.log(`  ⚠ Error with player ${player.id}: ${err.message.substring(0, 40)}`);
                }
            }

            console.log(`  ✓ ${teamCount} players`);
        }

        // 5. Verify
        console.log(`\n5. Verification:\n`);
        for (const team of teams) {
            const count = await query(`
                SELECT COUNT(*) as cnt
                FROM season_player_registrations
                WHERE season_id = @seasonId AND season_team_id = @seasonTeamId
            `, { seasonId, seasonTeamId: team.season_team_id });

            const cnt = count.recordset[0].cnt;
            const status = cnt === 0 ? '❌' : cnt < 16 ? '⚠️' : '✅';
            console.log(`${status} ${team.name}: ${cnt} players`);
        }

        console.log(`\n=== SUMMARY ===`);
        console.log(`Total registered: ${totalRegistered}`);
        console.log(`Average per team: ${(totalRegistered / teams.length).toFixed(1)}`);
        console.log(`\n✅ Distribution complete!`);

        process.exit(0);
    } catch (err: any) {
        console.error("\n❌ ERROR:", err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

run();
