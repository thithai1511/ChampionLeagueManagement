import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== V-LEAGUE PLAYER COUNT SUMMARY ===\n");

    try {
        const seasonRes = await query<{ season_id: number }>(`SELECT season_id FROM seasons WHERE code = 'VL2425'`);
        if (seasonRes.recordset.length === 0) {
            console.log("Season not found");
            process.exit(1);
        }
        const seasonId = seasonRes.recordset[0].season_id;

        // Total counts
        const summary = await query(`
            SELECT 
                COUNT(DISTINCT stp.season_team_id) as total_teams,
                COUNT(DISTINCT fp.id) as total_players,
                COUNT(DISTINCT spr.season_player_id) as total_registered
            FROM season_team_participants stp
            LEFT JOIN FootballPlayers fp ON (fp.internal_team_id = stp.team_id OR fp.team_external_id = stp.team_id)
            LEFT JOIN season_player_registrations spr ON (spr.player_id = fp.id AND spr.season_id = @seasonId)
            WHERE stp.season_id = @seasonId
        `, { seasonId });

        const { total_teams, total_players, total_registered } = summary.recordset[0];

        console.log(`Số đội: ${total_teams}`);
        console.log(`Tổng số cầu thủ: ${total_players}`);
        console.log(`Trung bình: ${(total_players / Math.max(1, total_teams)).toFixed(1)} cầu thủ/đội`);
        console.log(`Đã đăng ký cho season: ${total_registered}/${total_players}`);

        console.log("\n" + "=".repeat(60));

        // Per team breakdown
        const teams = await query(`
            SELECT 
                t.name,
                COUNT(DISTINCT fp.id) as players,
                COUNT(DISTINCT spr.season_player_id) as registered
            FROM season_team_participants stp
            JOIN teams t ON stp.team_id = t.team_id
            LEFT JOIN FootballPlayers fp ON (fp.internal_team_id = t.team_id OR fp.team_external_id = t.team_id)
            LEFT JOIN season_player_registrations spr ON (spr.player_id = fp.id AND spr.season_id = @seasonId)
            WHERE stp.season_id = @seasonId
            GROUP BY t.name
            ORDER BY COUNT(DISTINCT fp.id) DESC
        `, { seasonId });

        console.log("\nChi tiết theo đội:\n");
        teams.recordset.forEach((team: any) => {
            const status = team.players === 0 ? "❌" : team.players < 18 ? "⚠️" : "✅";
            console.log(`${status} ${team.name}: ${team.players} cầu thủ (${team.registered} đã đăng ký)`);
        });

        console.log("\n💡 Khuyến nghị:");
        if (total_players === 0) {
            console.log("   - Chưa có cầu thủ nào! Cần thêm cầu thủ vào database.");
        } else if (total_players < total_teams * 18) {
            console.log(`   - Thiếu cầu thủ! Cần thêm ~${total_teams * 18 - total_players} cầu thủ nữa.`);
            console.log("   - Khuyến nghị: 18-25 cầu thủ/đội cho đội hình đầy đủ.");
        }

        if (total_registered === 0) {
            console.log("   - Cần đăng ký cầu thủ cho season để có thể lập lineup!");
        }

        process.exit(0);
    } catch (err: any) {
        console.error("Error:", err.message);
        process.exit(1);
    }
}

run();
