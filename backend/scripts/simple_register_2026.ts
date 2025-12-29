import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== SIMPLE PLAYER REGISTRATION FOR 2026 ===\n");

    try {
        // Get season 2026
        const s2026 = await query<{ season_id: number }>(`
            SELECT season_id FROM seasons WHERE code = '2026'
        `);

        if (s2026.recordset.length === 0) {
            console.log("❌ Season 2026 not found!");
            process.exit(1);
        }

        const seasonId = s2026.recordset[0].season_id;
        console.log(`Season ID: ${seasonId}\n`);

        // Get teams
        const teams = await query<{ season_team_id: number, team_id: number, name: string }>(`
            SELECT stp.season_team_id, stp.team_id, t.name
            FROM season_team_participants stp
            JOIN teams t ON stp.team_id = t.team_id
            WHERE stp.season_id = @seasonId
        `, { seasonId });

        let total = 0;

        for (const team of teams.recordset) {
            const players = await query<{ id: number }>(`
                SELECT id FROM FootballPlayers
                WHERE internal_team_id = @teamId OR team_external_id = @teamId
            `, { teamId: team.team_id });

            let count = 0;
            for (const player of players.recordset) {
                try {
                    await query(`
                        INSERT INTO season_player_registrations (
                            season_id,
                            season_team_id,
                            player_id
                        ) VALUES (@seasonId, @seasonTeamId, @playerId)
                    `, {
                        seasonId,
                        seasonTeamId: team.season_team_id,
                        playerId: player.id
                    });
                    count++;
                    total++;
                } catch (err) {
                    // Skip duplicates
                }
            }
            if (count > 0) {
                console.log(`${team.name}: ${count} players`);
            }
        }

        console.log(`\n✅ Total: ${total} players registered!`);
        process.exit(0);
    } catch (err: any) {
        console.error("❌", err.message);
        process.exit(1);
    }
}

run();
