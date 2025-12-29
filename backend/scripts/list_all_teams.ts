import { query } from "../src/db/sqlServer";

async function run() {
    console.log("=== LISTING ALL TEAMS ===\n");

    try {
        const teamsRes = await query(`
            SELECT 
                team_id,
                name,
                short_name,
                code,
                city,
                country,
                founded_year
            FROM teams
            ORDER BY team_id
        `);

        console.log(`Found ${teamsRes.recordset.length} teams total:\n`);

        teamsRes.recordset.forEach((team, idx) => {
            console.log(`${idx + 1}. [ID: ${team.team_id}] ${team.name}`);
            console.log(`   Short: ${team.short_name || 'N/A'}, Code: ${team.code || 'N/A'}`);
            console.log(`   City: ${team.city || 'N/A'}, Country: ${team.country || 'N/A'}`);
            console.log(`   Founded: ${team.founded_year || 'N/A'}\n`);
        });

        // Check for Vietnamese city/province names
        console.log("\n=== TEAMS WITH VIETNAMESE CITIES ===\n");
        const vnCities = ['Hà Nội', 'TP.HCM', 'Thanh Hóa', 'Hải Phòng', 'Bình Dương', 'Nam Định',
            'Hà Tĩnh', 'Quảng Nam', 'Khánh Hòa', 'Đà Nẵng', 'Bình Định', 'Hoàng Anh Gia Lai'];

        const possibleVNTeams = teamsRes.recordset.filter(team =>
            vnCities.some(city => team.name?.includes(city) || team.city?.includes(city)) ||
            team.name?.includes('Viettel') ||
            team.name?.includes('Công An') ||
            team.name?.includes('SHB') ||
            team.name?.includes('HAGL')
        );

        console.log(`Found ${possibleVNTeams.length} possible V-League teams:`);
        possibleVNTeams.forEach(team => {
            console.log(`- [ID: ${team.team_id}] ${team.name} (${team.city || 'N/A'})`);
        });

        console.log(`\n\nTeam IDs: [${possibleVNTeams.map(t => t.team_id).join(', ')}]`);

        process.exit(0);
    } catch (err: any) {
        console.error("Error:", err.message);
        process.exit(1);
    }
}

run();
