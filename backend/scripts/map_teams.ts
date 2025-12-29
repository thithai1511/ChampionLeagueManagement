
import { query } from "../src/db/sqlServer";
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
export { }; // Ensure it's treated as a module

const dotenvPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: dotenvPath });

async function mapTeams() {
    try {
        console.log("Generating Team Mapping Report...");

        // 1. Source (Orphaned) Teams
        const sources = await query(`
            SELECT 
                p.team_name,
                p.team_external_id,
                COUNT(*) as player_count
            FROM dbo.FootballPlayers p
            LEFT JOIN dbo.FootballTeams t ON p.team_external_id = t.external_id
            WHERE t.id IS NULL AND p.team_external_id IS NOT NULL
            GROUP BY p.team_name, p.team_external_id
            ORDER BY p.team_name
        `);

        let report = "MISSING TEAMS (Old/Source names from Players):\n";
        if ((sources.recordset as any[]).length === 0) {
            report += "No missing teams found.\n";
        } else {
            (sources.recordset as any[]).forEach((s, idx) => {
                report += `${idx + 1}. ${s.team_name} (ID: ${s.team_external_id}) - ${s.player_count} players\n`;
            });
        }

        fs.writeFileSync(path.resolve(__dirname, 'orphaned_teams.txt'), report);
        console.log("Report saved to orphaned_teams.txt");

    } catch (err) {
        console.error("Error:", err);
    }
}

mapTeams();
