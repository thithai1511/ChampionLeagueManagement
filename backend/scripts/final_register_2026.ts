import { query } from "../src/db/sqlServer";

async function run() {
    try {
        console.log("=== FINAL FIX: REGISTER PLAYERS WITH ALL REQUIRED FIELDS ===\n");

        // 1. Get season 2026
        const s2026 = await query<{ season_id: number }>(`SELECT season_id FROM seasons WHERE code = '2026'`);
        const seasonId = s2026.recordset[0].season_id;
        console.log(`Season 2026 ID: ${seasonId}\n`);

        // 2. Get teams
        const teams = await query<{ season_team_id: number, team_id: number, name: string }>(`
            SELECT stp.season_team_id, stp.team_id, t.name
            FROM season_team_participants stp
            JOIN teams t ON stp.team_id = t.team_id
            WHERE stp.season_id = @seasonId
            ORDER BY t.name
        `, { seasonId });

        console.log(`Found ${teams.recordset.length} teams\n`);

        let total = 0;

        for (const team of teams.recordset) {
            // Get players from FootballPlayers for this team
            const players = await query<{ id: number, name: string, date_of_birth: any }>(`
                SELECT id, name, date_of_birth
                FROM FootballPlayers
                WHERE internal_team_id = @teamId OR team_external_id = @teamId
            `, { teamId: team.team_id });

            let count = 0;
            for (const player of players.recordset) {
                try {
                    // Calculate age
                    let age = 25; // default
                    if (player.date_of_birth) {
                        const dob = new Date(player.date_of_birth);
                        const seasonStart = new Date('2025-08-01');
                        age = seasonStart.getFullYear() - dob.getFullYear();
                    }

                    // INSERT with ALL required fields
                    await query(`
                        INSERT INTO season_player_registrations (
                            season_id,
                            season_team_id,
                            player_id,
                            player_type,
                            age_on_season_start
                        ) VALUES (
                            @seasonId,
                            @seasonTeamId,
                            @playerId,
                            'domestic',
                            @age
                        )
                    `, {
                        seasonId,
                        seasonTeamId: team.season_team_id,
                        playerId: player.id,  // FootballPlayers.id = players.player_id
                        age
                    });

                    count++;
                    total++;
                } catch (err: any) {
                    // Only log non-duplicate errors
                    if (!err.message.includes('duplicate') && !err.message.includes('UNIQUE') && !err.message.includes('UQ_season_player')) {
                        console.log(`  ⚠ ${player.name}: ${err.message.substring(0, 60)}`);
                    }
                }
            }

            if (count > 0) {
                console.log(`${team.name}: ${count} players`);
            }
        }

        console.log(`\n✅ Total: ${total} players registered!`);

        // Verify
        const finalCount = await query(`SELECT COUNT(*) as cnt FROM season_player_registrations WHERE season_id = @seasonId`, { seasonId });
        console.log(`\nVerified in database: ${finalCount.recordset[0].cnt} players`);

        process.exit(0);
    } catch (err: any) {
        console.error("\n❌ ERROR:", err.message);
        console.error("Error number:", err.number);
        process.exit(1);
    }
}

run();
