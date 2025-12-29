/**
 * Season Team Registration State Machine Service
 * 
 * Manages the complete lifecycle of team registration for a season:
 * DRAFT_INVITE -> INVITED -> ACCEPTED -> SUBMITTED -> APPROVED
 * 
 * Key Features:
 * - Single-point state transition API
 * - Automatic notification triggers
 * - State validation and audit trail
 * - Handles rejection and resubmission flows
 */

import { query } from "../db/sqlServer";
import { NotificationService } from "./notificationService";

// Registration workflow statuses
export type RegistrationStatus = 
  | "DRAFT_INVITE"     // BTC created draft invitation list
  | "INVITED"          // Invitation sent to team (with rules/regulations)
  | "ACCEPTED"         // Team accepted invitation
  | "DECLINED"         // Team declined invitation
  | "SUBMITTED"        // Team submitted registration documents
  | "REQUEST_CHANGE"   // BTC requests changes to submission
  | "APPROVED"         // BTC approved registration
  | "REJECTED";        // BTC rejected registration (team disqualified)

export interface SeasonRegistration {
  registration_id: number;
  season_id: number;
  team_id: number;
  team_name?: string;
  invitation_id?: number;
  fee_status: string;
  registration_status: RegistrationStatus;
  submission_data?: any;  // JSON data containing stadium, kits, players, etc.
  reviewer_note?: string;
  submitted_at?: string;
  reviewed_at?: string;
  reviewed_by?: number;
  created_at: string;
  updated_at: string;
}

export interface SubmissionData {
  // Stadium information
  stadium?: {
    name: string;
    capacity: number;
    rating: number;
    city: string;
    country?: string;
  };
  
  // Kit information
  kits?: {
    home: {
      shirt_color: string;
      shorts_color: string;
      socks_color: string;
      image_url?: string;
    };
    away: {
      shirt_color: string;
      shorts_color: string;
      socks_color: string;
      image_url?: string;
    };
    third?: {
      shirt_color: string;
      shorts_color: string;
      socks_color: string;
      image_url?: string;
    };
  };
  
  // Player information (summary)
  players?: {
    total_count: number;
    foreign_count: number;
    player_ids?: number[];
  };
  
  // Additional documents
  documents?: {
    governing_body_license?: string;
    insurance_certificate?: string;
    other_documents?: string[];
  };
}

/**
 * State transition validation rules
 */
const VALID_TRANSITIONS: Record<RegistrationStatus, RegistrationStatus[]> = {
  DRAFT_INVITE: ["INVITED"],
  INVITED: ["ACCEPTED", "DECLINED"],
  ACCEPTED: ["SUBMITTED", "DECLINED"],
  DECLINED: [],  // Terminal state
  SUBMITTED: ["REQUEST_CHANGE", "APPROVED", "REJECTED"],
  REQUEST_CHANGE: ["SUBMITTED", "REJECTED"],
  APPROVED: [],  // Terminal state (success)
  REJECTED: [],  // Terminal state (failure)
};

/**
 * Validate if a state transition is allowed
 */
function isValidTransition(fromStatus: RegistrationStatus, toStatus: RegistrationStatus): boolean {
  return VALID_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}

/**
 * BTC Requirements - Quy định của Ban tổ chức
 */
export const BTC_REQUIREMENTS = {
  MIN_PLAYERS: 16,
  MAX_PLAYERS: 22,
  MAX_FOREIGN_PLAYERS_REGISTRATION: 5,  // Khi đăng ký
  MAX_FOREIGN_PLAYERS_MATCH: 3,         // Khi thi đấu trên sân
  MIN_PLAYER_AGE: 16,
  MIN_STADIUM_CAPACITY: 10000,
  MIN_STADIUM_RATING: 2,                // Tối thiểu 2 sao FIFA
  REGISTRATION_FEE: 1000000000,         // 1 tỷ VND
  COUNTRY_REQUIRED: "Vietnam",          // CLB phải thuộc Việt Nam
  RESPONSE_DEADLINE_DAYS: 14,           // Hạn phản hồi 2 tuần
};

/**
 * Validate submission data against BTC requirements
 * Kiểm tra hồ sơ đăng ký theo quy định BTC
 */
export function validateSubmissionData(data: SubmissionData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 1. Stadium validation - Kiểm tra sân nhà
  if (!data.stadium) {
    errors.push('Thông tin sân nhà là bắt buộc');
  } else {
    if (!data.stadium.name || data.stadium.name.trim() === '') {
      errors.push('Tên sân nhà là bắt buộc');
    }
    if (!data.stadium.capacity || data.stadium.capacity < BTC_REQUIREMENTS.MIN_STADIUM_CAPACITY) {
      errors.push(`Sức chứa sân nhà tối thiểu ${BTC_REQUIREMENTS.MIN_STADIUM_CAPACITY.toLocaleString()} chỗ (hiện tại: ${data.stadium?.capacity?.toLocaleString() || 0})`);
    }
    if (!data.stadium.rating || data.stadium.rating < BTC_REQUIREMENTS.MIN_STADIUM_RATING) {
      errors.push(`Sân nhà phải đạt chuẩn tối thiểu ${BTC_REQUIREMENTS.MIN_STADIUM_RATING} sao FIFA`);
    }
    if (!data.stadium.city || data.stadium.city.trim() === '') {
      errors.push('Thành phố của sân nhà là bắt buộc');
    }
    // CLB phải thuộc Việt Nam
    if (data.stadium.country && data.stadium.country.toLowerCase() !== 'vietnam' && data.stadium.country.toLowerCase() !== 'việt nam') {
      errors.push('Sân nhà phải nằm tại Việt Nam');
    }
  }
  
  // 2. Kit validation - Kiểm tra áo đấu
  if (!data.kits) {
    errors.push('Thông tin áo đấu là bắt buộc');
  } else {
    if (!data.kits.home || !data.kits.home.shirt_color) {
      errors.push('Áo đấu sân nhà là bắt buộc');
    }
    if (!data.kits.away || !data.kits.away.shirt_color) {
      errors.push('Áo đấu sân khách là bắt buộc');
    }
    // Check if home and away kits are different
    if (data.kits.home && data.kits.away && 
        data.kits.home.shirt_color === data.kits.away.shirt_color) {
      errors.push('Áo đấu sân nhà và sân khách phải khác màu');
    }
  }
  
  // 3. Players validation - Kiểm tra cầu thủ
  if (!data.players) {
    errors.push('Thông tin cầu thủ là bắt buộc');
  } else {
    if (data.players.total_count < BTC_REQUIREMENTS.MIN_PLAYERS) {
      errors.push(`Số cầu thủ tối thiểu ${BTC_REQUIREMENTS.MIN_PLAYERS} (hiện tại: ${data.players.total_count})`);
    }
    if (data.players.total_count > BTC_REQUIREMENTS.MAX_PLAYERS) {
      errors.push(`Số cầu thủ tối đa ${BTC_REQUIREMENTS.MAX_PLAYERS} (hiện tại: ${data.players.total_count})`);
    }
    if (data.players.foreign_count > BTC_REQUIREMENTS.MAX_FOREIGN_PLAYERS_REGISTRATION) {
      errors.push(`Số cầu thủ ngoại tối đa ${BTC_REQUIREMENTS.MAX_FOREIGN_PLAYERS_REGISTRATION} (hiện tại: ${data.players.foreign_count})`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Main API: Change team registration status
 * This is the "one-stop" function that handles all state changes
 * 
 * @param registrationId - The registration ID
 * @param newStatus - The new status to transition to
 * @param payload - Optional data (note, submission data, etc.)
 * @returns Updated registration
 */
export async function changeTeamStatus(
  registrationId: number,
  newStatus: RegistrationStatus,
  payload?: {
    note?: string;
    submissionData?: SubmissionData;
    reviewedBy?: number;
  }
): Promise<SeasonRegistration> {
  // 1. Get current registration
  const registration = await getRegistration(registrationId);
  if (!registration) {
    throw new Error(`Registration ${registrationId} not found`);
  }

  // 2. Validate transition
  if (!isValidTransition(registration.registration_status as RegistrationStatus, newStatus)) {
    throw new Error(
      `Invalid state transition from ${registration.registration_status} to ${newStatus}`
    );
  }

  // 2.5. Validate submission data when transitioning to SUBMITTED
  if (newStatus === "SUBMITTED" && payload?.submissionData) {
    const validation = validateSubmissionData(payload.submissionData);
    if (!validation.valid) {
      throw new Error(`Hồ sơ không hợp lệ:\n- ${validation.errors.join('\n- ')}`);
    }
  }

  // 3. Build update query based on new status
  const updateFields: string[] = ["registration_status = @newStatus"];
  const params: any = {
    registrationId,
    newStatus,
  };

  // Add reviewer note if provided
  if (payload?.note) {
    updateFields.push("reviewer_note = @note");
    params.note = payload.note;
  }

  // Add submission data if provided
  if (payload?.submissionData) {
    updateFields.push("submission_data = @submissionData");
    params.submissionData = JSON.stringify(payload.submissionData);
  }

  // Add reviewed fields for BTC actions
  if (["REQUEST_CHANGE", "APPROVED", "REJECTED"].includes(newStatus)) {
    updateFields.push("reviewed_at = SYSUTCDATETIME()");
    if (payload?.reviewedBy) {
      updateFields.push("reviewed_by = @reviewedBy");
      params.reviewedBy = payload.reviewedBy;
    }
  }

  // Add submitted_at for team submission
  if (newStatus === "SUBMITTED") {
    updateFields.push("submitted_at = SYSUTCDATETIME()");
  }

  // 4. Update database
  await query(
    `
    UPDATE season_team_registrations
    SET ${updateFields.join(", ")}
    WHERE registration_id = @registrationId
    `,
    params
  );

  // 5. Log status change to audit table
  await logStatusChange(
    registrationId,
    registration.registration_status as RegistrationStatus,
    newStatus,
    payload?.reviewedBy,
    payload?.note
  );

  // 6. Trigger notifications based on new status
  await triggerNotification(registration, newStatus, payload?.note);

  // 7. Return updated registration
  return await getRegistration(registrationId) as SeasonRegistration;
}

/**
 * Get registration by ID
 */
export async function getRegistration(registrationId: number): Promise<SeasonRegistration | null> {
  const result = await query<SeasonRegistration>(
    `
    SELECT 
      r.registration_id,
      r.season_id,
      r.team_id,
      t.name as team_name,
      r.invitation_id,
      r.fee_status,
      r.registration_status,
      r.submission_data,
      r.reviewer_note,
      CONVERT(VARCHAR(23), r.submitted_at, 126) as submitted_at,
      CONVERT(VARCHAR(23), r.reviewed_at, 126) as reviewed_at,
      r.reviewed_by,
      CONVERT(VARCHAR(23), r.created_at, 126) as created_at,
      CONVERT(VARCHAR(23), r.updated_at, 126) as updated_at
    FROM season_team_registrations r
    INNER JOIN teams t ON r.team_id = t.team_id
    WHERE r.registration_id = @registrationId
    `,
    { registrationId }
  );

  return result.recordset[0] || null;
}

/**
 * Get registrations for a season
 */
export async function getSeasonRegistrations(
  seasonId: number,
  status?: RegistrationStatus
): Promise<SeasonRegistration[]> {
  let sql = `
    SELECT 
      r.registration_id,
      r.season_id,
      r.team_id,
      t.name as team_name,
      r.invitation_id,
      r.fee_status,
      r.registration_status,
      r.submission_data,
      r.reviewer_note,
      CONVERT(VARCHAR(23), r.submitted_at, 126) as submitted_at,
      CONVERT(VARCHAR(23), r.reviewed_at, 126) as reviewed_at,
      r.reviewed_by,
      CONVERT(VARCHAR(23), r.created_at, 126) as created_at,
      CONVERT(VARCHAR(23), r.updated_at, 126) as updated_at
    FROM season_team_registrations r
    INNER JOIN teams t ON r.team_id = t.team_id
    WHERE r.season_id = @seasonId
  `;

  const params: any = { seasonId };

  if (status) {
    sql += " AND r.registration_status = @status";
    params.status = status;
  }

  sql += " ORDER BY r.created_at DESC";

  const result = await query<SeasonRegistration>(sql, params);
  return result.recordset;
}

/**
 * Create a new registration (usually from invitation)
 */
export async function createRegistration(
  seasonId: number,
  teamId: number,
  invitationId?: number,
  status: RegistrationStatus = "DRAFT_INVITE"
): Promise<SeasonRegistration> {
  const result = await query<{ registration_id: number }>(
    `
    INSERT INTO season_team_registrations (
      season_id,
      team_id,
      invitation_id,
      registration_status,
      fee_status,
      home_stadium_name,
      home_stadium_capacity,
      home_stadium_rating,
      squad_size,
      foreign_player_count
    )
    OUTPUT INSERTED.registration_id
    VALUES (
      @seasonId,
      @teamId,
      @invitationId,
      @status,
      'unpaid',
      'TBD',
      10000,
      2,
      18,
      0
    )
    `,
    { seasonId, teamId, invitationId: invitationId || null, status }
  );

  const registrationId = result.recordset[0]?.registration_id;
  if (!registrationId) {
    throw new Error("Failed to create registration");
  }

  return await getRegistration(registrationId) as SeasonRegistration;
}

/**
 * Log status change to audit table
 */
async function logStatusChange(
  registrationId: number,
  fromStatus: RegistrationStatus,
  toStatus: RegistrationStatus,
  changedBy?: number,
  note?: string
): Promise<void> {
  await query(
    `
    INSERT INTO season_registration_status_history (
      registration_id,
      from_status,
      to_status,
      changed_by,
      note
    )
    VALUES (
      @registrationId,
      @fromStatus,
      @toStatus,
      @changedBy,
      @note
    )
    `,
    {
      registrationId,
      fromStatus,
      toStatus,
      changedBy: changedBy || null,
      note: note || null,
    }
  );
}

/**
 * Trigger notifications based on status change
 * This is where the "automatic notification" magic happens
 */
async function triggerNotification(
  registration: SeasonRegistration,
  newStatus: RegistrationStatus,
  note?: string
): Promise<void> {
  // Get team admin ID
  const teamAdminResult = await query<{ user_id: number }>(
    `
    SELECT TOP 1 uta.user_id
    FROM user_team_assignments uta
    WHERE uta.team_id = @teamId
    AND uta.role = 'admin'
    `,
    { teamId: registration.team_id }
  );

  const teamAdminId = teamAdminResult.recordset[0]?.user_id;
  if (!teamAdminId) {
    console.warn(`No team admin found for team ${registration.team_id}`);
    return;
  }

  // Get season info for notification
  const seasonResult = await query<{ name: string }>(
    `SELECT name FROM seasons WHERE season_id = @seasonId`,
    { seasonId: registration.season_id }
  );
  const seasonName = seasonResult.recordset[0]?.name || "Season";

  // Determine notification based on status
  switch (newStatus) {
    case "INVITED":
      // Yêu cầu 1: Gửi giấy mời + Quy định
      await NotificationService.createNotification({
        userId: teamAdminId,
        type: "season_invitation",
        title: `Lời mời tham gia ${seasonName}`,
        message: `Đội ${registration.team_name} đã nhận được lời mời tham gia ${seasonName}. Vui lòng xem quy định và phản hồi trong vòng 2 tuần.`,
        relatedEntity: "season_registration",
        relatedId: registration.registration_id,
        actionUrl: `/team/season-registration/${registration.registration_id}`,
      });
      break;

    case "ACCEPTED":
      // Team accepted - notify to submit documents
      await NotificationService.createNotification({
        userId: teamAdminId,
        type: "registration_pending",
        title: `Vui lòng hoàn tất hồ sơ đăng ký`,
        message: `Đội ${registration.team_name} đã đồng ý tham gia ${seasonName}. Vui lòng hoàn tất hồ sơ đăng ký (sân, áo đấu, cầu thủ).`,
        relatedEntity: "season_registration",
        relatedId: registration.registration_id,
        actionUrl: `/team/season-registration/${registration.registration_id}/submit`,
      });
      break;

    case "DECLINED":
      // Team declined - notify BTC
      // BTC will handle finding replacement team
      break;

    case "SUBMITTED":
      // Notify BTC to review
      // Get all BTC admins
      const btcAdmins = await query<{ user_id: number }>(
        `SELECT user_id FROM user_accounts WHERE role = 'admin' AND status = 'active'`
      );
      
      for (const admin of btcAdmins.recordset) {
        await NotificationService.createNotification({
          userId: admin.user_id,
          type: "registration_review",
          title: `Hồ sơ mới cần duyệt`,
          message: `Đội ${registration.team_name} đã nộp hồ sơ đăng ký ${seasonName}. Vui lòng kiểm tra và duyệt.`,
          relatedEntity: "season_registration",
          relatedId: registration.registration_id,
          actionUrl: `/admin/season-registration/${registration.registration_id}/review`,
        });
      }
      break;

    case "REQUEST_CHANGE":
      // Yêu cầu 2: BTC yêu cầu sửa đổi
      await NotificationService.createNotification({
        userId: teamAdminId,
        type: "registration_change_request",
        title: `Yêu cầu bổ sung hồ sơ`,
        message: `Hồ sơ đăng ký ${seasonName} chưa đạt. Lý do: ${note || "Vui lòng kiểm tra lại thông tin"}. Vui lòng nộp lại.`,
        relatedEntity: "season_registration",
        relatedId: registration.registration_id,
        actionUrl: `/team/season-registration/${registration.registration_id}/edit`,
      });
      break;

    case "APPROVED":
      // Yêu cầu 2: Đã duyệt xong
      await NotificationService.createNotification({
        userId: teamAdminId,
        type: "registration_approved",
        title: `Hồ sơ đã được duyệt`,
        message: `Hồ sơ đăng ký ${seasonName} của đội ${registration.team_name} đã được duyệt. Chờ xếp lịch thi đấu.`,
        relatedEntity: "season_registration",
        relatedId: registration.registration_id,
        actionUrl: `/team/season/${registration.season_id}`,
      });
      break;

    case "REJECTED":
      // Đội bị loại
      await NotificationService.createNotification({
        userId: teamAdminId,
        type: "registration_rejected",
        title: `Hồ sơ không được duyệt`,
        message: `Rất tiếc, đội ${registration.team_name} không đủ điều kiện tham gia ${seasonName}. Lý do: ${note || "Không đáp ứng yêu cầu"}`,
        relatedEntity: "season_registration",
        relatedId: registration.registration_id,
      });
      break;
  }
}

/**
 * Check if season has enough approved teams (10 teams)
 */
export async function checkReadyForScheduling(seasonId: number): Promise<{
  ready: boolean;
  approvedCount: number;
  requiredCount: number;
}> {
  const result = await query<{ cnt: number }>(
    `
    SELECT COUNT(*) as cnt
    FROM season_team_registrations
    WHERE season_id = @seasonId
    AND registration_status = 'APPROVED'
    `,
    { seasonId }
  );

  const approvedCount = result.recordset[0]?.cnt || 0;
  const requiredCount = 10; // V-League requires 10 teams

  return {
    ready: approvedCount >= requiredCount,
    approvedCount,
    requiredCount,
  };
}

/**
 * Get status statistics for a season
 */
export async function getStatusStatistics(seasonId: number): Promise<{
  [key in RegistrationStatus]?: number;
}> {
  const result = await query<{ registration_status: RegistrationStatus; cnt: number }>(
    `
    SELECT registration_status, COUNT(*) as cnt
    FROM season_team_registrations
    WHERE season_id = @seasonId
    GROUP BY registration_status
    `,
    { seasonId }
  );

  const stats: { [key in RegistrationStatus]?: number } = {};
  for (const row of result.recordset) {
    stats[row.registration_status] = row.cnt;
  }

  return stats;
}

/**
 * Batch send invitations (DRAFT_INVITE -> INVITED)
 */
export async function batchSendInvitations(
  seasonId: number,
  reviewedBy?: number
): Promise<{ sent: number; failed: number }> {
  const registrations = await getSeasonRegistrations(seasonId, "DRAFT_INVITE");
  
  let sent = 0;
  let failed = 0;

  for (const reg of registrations) {
    try {
      await changeTeamStatus(reg.registration_id, "INVITED", { reviewedBy });
      sent++;
    } catch (error) {
      console.error(`Failed to send invitation for registration ${reg.registration_id}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}
