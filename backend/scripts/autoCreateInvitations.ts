/**
 * Script để tự động tạo lời mời cho mùa giải mới
 * Sử dụng Season Registration Service (State Machine)
 * 
 * Cách sử dụng:
 * 1. Đảm bảo đã có mùa giải trước hoàn thành với bảng xếp hạng
 * 2. Tạo mùa giải mới
 * 3. Chạy script này với các tham số phù hợp
 * 
 * Ví dụ:
 * ts-node backend/scripts/autoCreateInvitations.ts --seasonId 2 --previousSeasonId 1 --promotedTeamIds 10,11
 */

import { query } from "../src/db/sqlServer";
import * as registrationService from "../src/services/seasonRegistrationService";

interface ScriptArgs {
  seasonId: number;
  previousSeasonId: number;
  promotedTeamIds?: number[];
  responseDeadlineDays?: number;
  userId: number;
}

interface TopTeam {
  teamId: number;
  teamName: string;
  rank: number;
  points: number;
}

/**
 * Lấy danh sách top N đội từ mùa giải trước
 * Dựa trên bảng xếp hạng cuối mùa
 */
async function getTopTeamsFromSeason(seasonId: number, topN: number = 8): Promise<TopTeam[]> {
  const result = await query<{
    team_id: number;
    team_name: string;
    final_position: number;
    points: number;
  }>(
    `
    SELECT TOP (@topN)
      t.team_id,
      t.name as team_name,
      COALESCE(st.final_position, st.position) as final_position,
      COALESCE(st.points, 0) as points
    FROM standings st
    INNER JOIN season_team_participants stp ON st.season_team_id = stp.season_team_id
    INNER JOIN teams t ON stp.team_id = t.team_id
    WHERE st.season_id = @seasonId
    ORDER BY st.final_position ASC, st.points DESC
    `,
    { seasonId, topN }
  );

  return result.recordset.map(row => ({
    teamId: row.team_id,
    teamName: row.team_name,
    rank: row.final_position,
    points: row.points,
  }));
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const parsedArgs: Partial<ScriptArgs> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    
    if (key === 'seasonId') {
      parsedArgs.seasonId = parseInt(value, 10);
    } else if (key === 'previousSeasonId') {
      parsedArgs.previousSeasonId = parseInt(value, 10);
    } else if (key === 'promotedTeamIds') {
      parsedArgs.promotedTeamIds = value.split(',').map(id => parseInt(id.trim(), 10));
    } else if (key === 'responseDeadlineDays') {
      parsedArgs.responseDeadlineDays = parseInt(value, 10);
    } else if (key === 'userId') {
      parsedArgs.userId = parseInt(value, 10);
    }
  }

  // Validate required arguments
  if (!parsedArgs.seasonId || !parsedArgs.previousSeasonId) {
    console.error('❌ Thiếu tham số bắt buộc!');
    console.log('\nCách sử dụng:');
    console.log('ts-node backend/scripts/autoCreateInvitations.ts --seasonId <ID> --previousSeasonId <ID> [--promotedTeamIds <ID1,ID2>] [--responseDeadlineDays <days>] [--userId <ID>]');
    console.log('\nVí dụ:');
    console.log('ts-node backend/scripts/autoCreateInvitations.ts --seasonId 2 --previousSeasonId 1 --promotedTeamIds 10,11 --responseDeadlineDays 14 --userId 1');
    process.exit(1);
  }

  // Get default userId from database (first admin user)
  let userId = parsedArgs.userId;
  if (!userId) {
    try {
      const userResult = await query<{ user_id: number }>(
        `SELECT TOP 1 user_id FROM user_accounts WHERE role = 'admin' ORDER BY user_id ASC`
      );
      userId = userResult.recordset[0]?.user_id;
      if (!userId) {
        console.error('❌ Không tìm thấy admin user nào trong database. Vui lòng chỉ định --userId');
        process.exit(1);
      }
      console.log(`ℹ️  Sử dụng userId: ${userId}`);
    } catch (error) {
      console.error('❌ Lỗi khi lấy userId:', error);
      process.exit(1);
    }
  }

  try {
    console.log('\n📋 Thông tin yêu cầu:');
    console.log(`   - Season ID: ${parsedArgs.seasonId}`);
    console.log(`   - Previous Season ID: ${parsedArgs.previousSeasonId}`);
    console.log(`   - Promoted Team IDs: ${parsedArgs.promotedTeamIds?.join(', ') || 'Chưa chỉ định'}`);
    console.log(`   - Response Deadline: ${parsedArgs.responseDeadlineDays || 14} ngày`);
    console.log(`   - User ID: ${userId}`);

    // Validate seasons exist
    console.log('\n🔍 Kiểm tra mùa giải...');
    const seasonCheck = await query<{ season_id: number; name: string; status: string }>(
      `SELECT season_id, name, status FROM seasons WHERE season_id = @seasonId`,
      { seasonId: parsedArgs.seasonId }
    );

    if (!seasonCheck.recordset[0]) {
      console.error(`❌ Không tìm thấy mùa giải ID ${parsedArgs.seasonId}`);
      process.exit(1);
    }
    console.log(`✅ Mùa giải: ${seasonCheck.recordset[0].name} (${seasonCheck.recordset[0].status})`);

    const prevSeasonCheck = await query<{ season_id: number; name: string; status: string }>(
      `SELECT season_id, name, status FROM seasons WHERE season_id = @previousSeasonId`,
      { previousSeasonId: parsedArgs.previousSeasonId }
    );

    if (!prevSeasonCheck.recordset[0]) {
      console.error(`❌ Không tìm thấy mùa giải trước ID ${parsedArgs.previousSeasonId}`);
      process.exit(1);
    }
    console.log(`✅ Mùa giải trước: ${prevSeasonCheck.recordset[0].name} (${prevSeasonCheck.recordset[0].status})`);

    // Get top 8 teams from previous season
    console.log('\n🔍 Lấy danh sách top 8 đội từ mùa giải trước...');
    const topTeams = await getTopTeamsFromSeason(parsedArgs.previousSeasonId, 8);
    
    if (topTeams.length < 8) {
      console.warn(`⚠️  Cảnh báo: Chỉ tìm thấy ${topTeams.length}/8 đội trong mùa giải trước`);
    } else {
      console.log(`✅ Tìm thấy ${topTeams.length} đội:`);
      topTeams.forEach((team, index) => {
        console.log(`   ${index + 1}. ${team.teamName} (Rank: ${team.rank}, Points: ${team.points})`);
      });
    }

    // Validate promoted teams if provided
    const promotedTeams: { teamId: number; teamName: string }[] = [];
    if (parsedArgs.promotedTeamIds && parsedArgs.promotedTeamIds.length > 0) {
      console.log('\n🔍 Kiểm tra các đội thăng hạng...');
      for (const teamId of parsedArgs.promotedTeamIds) {
        const teamCheck = await query<{ team_id: number; name: string }>(
          `SELECT team_id, name FROM teams WHERE team_id = @teamId`,
          { teamId }
        );
        if (teamCheck.recordset[0]) {
          console.log(`✅ ${teamCheck.recordset[0].name} (ID: ${teamId})`);
          promotedTeams.push({ teamId, teamName: teamCheck.recordset[0].name });
        } else {
          console.error(`❌ Không tìm thấy đội ID ${teamId}`);
          process.exit(1);
        }
      }
    } else {
      console.log('\n⚠️  Chưa chỉ định đội thăng hạng. Vui lòng chỉ định --promotedTeamIds');
      console.log('   Ví dụ: --promotedTeamIds 10,11');
      process.exit(1);
    }

    // Check total teams = 10
    const totalTeams = topTeams.length + promotedTeams.length;
    if (totalTeams !== 10) {
      console.warn(`⚠️  Tổng số đội là ${totalTeams} (yêu cầu 10 đội)`);
    }

    // Create registrations using new state machine service
    console.log('\n📨 Đang tạo đăng ký với trạng thái DRAFT_INVITE...');
    
    const createdRegistrations: { teamId: number; teamName: string; registrationId: number; type: string }[] = [];
    
    // Create registrations for retained teams (top 8)
    for (const team of topTeams) {
      try {
        const registration = await registrationService.createRegistration(
          parsedArgs.seasonId,
          team.teamId,
          undefined, // invitationId - not used in new system
          "DRAFT_INVITE"
        );
        createdRegistrations.push({
          teamId: team.teamId,
          teamName: team.teamName,
          registrationId: registration.registration_id,
          type: 'retained'
        });
        console.log(`   ✅ Created registration for ${team.teamName}`);
      } catch (error: any) {
        console.error(`   ❌ Failed to create registration for ${team.teamName}: ${error.message}`);
      }
    }

    // Create registrations for promoted teams
    for (const team of promotedTeams) {
      try {
        const registration = await registrationService.createRegistration(
          parsedArgs.seasonId,
          team.teamId,
          undefined,
          "DRAFT_INVITE"
        );
        createdRegistrations.push({
          teamId: team.teamId,
          teamName: team.teamName,
          registrationId: registration.registration_id,
          type: 'promoted'
        });
        console.log(`   ✅ Created registration for ${team.teamName} (promoted)`);
      } catch (error: any) {
        console.error(`   ❌ Failed to create registration for ${team.teamName}: ${error.message}`);
      }
    }

    console.log('\n✅ Hoàn thành tạo DRAFT_INVITE!');
    console.log(`   - Tổng số đăng ký đã tạo: ${createdRegistrations.length}`);

    // Send invitations (DRAFT_INVITE -> INVITED)
    console.log('\n📨 Đang gửi lời mời (DRAFT_INVITE -> INVITED)...');
    const sendResult = await registrationService.batchSendInvitations(parsedArgs.seasonId, userId);
    console.log(`   ✅ Đã gửi: ${sendResult.sent} lời mời`);
    if (sendResult.failed > 0) {
      console.log(`   ⚠️ Thất bại: ${sendResult.failed} lời mời`);
    }

    console.log('\n📋 Chi tiết các đăng ký:');
    
    const retained = createdRegistrations.filter(r => r.type === 'retained');
    const promoted = createdRegistrations.filter(r => r.type === 'promoted');
    
    console.log('\n   🏆 Đội được giữ lại (Top 8):');
    retained.forEach((reg, index) => {
      console.log(`   ${index + 1}. ${reg.teamName} (ID: ${reg.teamId}, Registration ID: ${reg.registrationId})`);
    });

    if (promoted.length > 0) {
      console.log('\n   ⬆️  Đội thăng hạng:');
      promoted.forEach((reg, index) => {
        console.log(`   ${index + 1}. ${reg.teamName} (ID: ${reg.teamId}, Registration ID: ${reg.registrationId})`);
      });
    }

    console.log('\n💡 Bạn có thể kiểm tra đăng ký bằng API:');
    console.log(`   GET /api/seasons/${parsedArgs.seasonId}/registrations`);
    console.log(`   GET /api/seasons/${parsedArgs.seasonId}/registrations/statistics`);

  } catch (error: any) {
    console.error('\n❌ Lỗi:', error.message || error);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
