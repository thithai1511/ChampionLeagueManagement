import { query } from "../db/sqlServer";
import { BadRequestError } from "../utils/httpError";

export interface TeamEligibilityResult {
  isEligible: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    participationFee: { passed: boolean; message: string };
    governingBody: { passed: boolean; message: string };
    playerCount: { passed: boolean; message: string; currentCount?: number };
    foreignPlayerCount: { passed: boolean; message: string; currentCount?: number };
    playerAge: { passed: boolean; message: string; violations?: Array<{ playerId: number; playerName: string; age: number }> };
    stadiumCapacity: { passed: boolean; message: string; currentCapacity?: number };
    stadiumRating: { passed: boolean; message: string; currentRating?: number };
    stadiumLocation: { passed: boolean; message: string };
  };
}

export interface EligibilityCheckInput {
  teamId: number;
  seasonId: number;
  participationFeePaid: boolean;
  governingBodyInVietnam?: boolean; // Optional: will be checked if not provided
  stadiumCapacity?: number | null;
  stadiumRating?: number | null;
  stadiumCity?: string | null;
  stadiumCountry?: string | null;
}

// Constants based on requirements
export const REQUIREMENTS = {
  PARTICIPATION_FEE_VND: 1000000000, // 1 billion VND
  MIN_PLAYERS: 16,
  MAX_PLAYERS: 22,
  MAX_FOREIGN_PLAYERS_REGISTRATION: 5,
  MAX_FOREIGN_PLAYERS_MATCH: 3,
  MIN_PLAYER_AGE: 16,
  MIN_STADIUM_CAPACITY: 10000,
  MIN_STADIUM_RATING: 2,
  REQUIRED_COUNTRY: "Vietnam", // For governing body and stadium
} as const;

/**
 * Validate team eligibility based on all requirements
 */
export async function validateTeamEligibility(
  input: EligibilityCheckInput
): Promise<TeamEligibilityResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: TeamEligibilityResult["checks"] = {
    participationFee: { passed: false, message: "" },
    governingBody: { passed: false, message: "" },
    playerCount: { passed: false, message: "" },
    foreignPlayerCount: { passed: false, message: "" },
    playerAge: { passed: false, message: "" },
    stadiumCapacity: { passed: false, message: "" },
    stadiumRating: { passed: false, message: "" },
    stadiumLocation: { passed: false, message: "" },
  };

  // 1. Check participation fee (1 billion VND)
  if (input.participationFeePaid) {
    checks.participationFee = {
      passed: true,
      message: "Lệ phí tham gia đã được thanh toán",
    };
  } else {
    checks.participationFee = {
      passed: false,
      message: `Lệ phí tham gia chưa được thanh toán (yêu cầu: ${REQUIREMENTS.PARTICIPATION_FEE_VND.toLocaleString("vi-VN")} VNĐ)`,
    };
    errors.push(checks.participationFee.message);
  }

  // 2. Check governing body location (must be in Vietnam)
  let governingBodyInVietnam = input.governingBodyInVietnam;
  
  // Get team data if not provided
  if (governingBodyInVietnam === undefined) {
    const teamData = await getTeamEligibilityData(input.teamId, input.seasonId);
    governingBodyInVietnam = checkGoverningBodyInVietnam(
      teamData.governingBody,
      teamData.country
    );
  }

  if (governingBodyInVietnam) {
    checks.governingBody = {
      passed: true,
      message: "Cơ quan chủ quản có trụ sở tại Việt Nam",
    };
  } else {
    checks.governingBody = {
      passed: false,
      message: "Cơ quan chủ quản phải có trụ sở tại Việt Nam",
    };
    errors.push(checks.governingBody.message);
  }

  // 3. Check player count (16-22 players)
  const playerCountResult = await query<{ count: number }>(
    `
    SELECT COUNT(*) AS count
    FROM season_player_registrations spr
    INNER JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
    WHERE stp.season_id = @seasonId
      AND stp.team_id = @teamId
      AND spr.registration_status IN ('pending', 'approved')
    `,
    { seasonId: input.seasonId, teamId: input.teamId }
  );

  const playerCount = playerCountResult.recordset[0]?.count ?? 0;

  if (playerCount >= REQUIREMENTS.MIN_PLAYERS && playerCount <= REQUIREMENTS.MAX_PLAYERS) {
    checks.playerCount = {
      passed: true,
      message: `Số lượng cầu thủ hợp lệ: ${playerCount}/${REQUIREMENTS.MIN_PLAYERS}-${REQUIREMENTS.MAX_PLAYERS}`,
      currentCount: playerCount,
    };
  } else {
    const message =
      playerCount < REQUIREMENTS.MIN_PLAYERS
        ? `Số lượng cầu thủ không đủ: ${playerCount} (tối thiểu: ${REQUIREMENTS.MIN_PLAYERS})`
        : `Số lượng cầu thủ vượt quá: ${playerCount} (tối đa: ${REQUIREMENTS.MAX_PLAYERS})`;
    checks.playerCount = {
      passed: false,
      message,
      currentCount: playerCount,
    };
    errors.push(message);
  }

  // 4. Check foreign player count (max 5 at registration)
  const foreignPlayerCountResult = await query<{ count: number }>(
    `
    SELECT COUNT(*) AS count
    FROM season_player_registrations spr
    INNER JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
    WHERE stp.season_id = @seasonId
      AND stp.team_id = @teamId
      AND spr.registration_status IN ('pending', 'approved')
      AND spr.player_type = 'foreign'
    `,
    { seasonId: input.seasonId, teamId: input.teamId }
  );

  const foreignPlayerCount = foreignPlayerCountResult.recordset[0]?.count ?? 0;

  if (foreignPlayerCount <= REQUIREMENTS.MAX_FOREIGN_PLAYERS_REGISTRATION) {
    checks.foreignPlayerCount = {
      passed: true,
      message: `Số lượng cầu thủ nước ngoài hợp lệ: ${foreignPlayerCount}/${REQUIREMENTS.MAX_FOREIGN_PLAYERS_REGISTRATION} (tối đa khi đăng ký)`,
      currentCount: foreignPlayerCount,
    };
    if (foreignPlayerCount > REQUIREMENTS.MAX_FOREIGN_PLAYERS_MATCH) {
      warnings.push(
        `Lưu ý: Có ${foreignPlayerCount} cầu thủ nước ngoài đã đăng ký, nhưng chỉ được sử dụng tối đa ${REQUIREMENTS.MAX_FOREIGN_PLAYERS_MATCH} trong mỗi trận đấu`
      );
    }
  } else {
    const message = `Số lượng cầu thủ nước ngoài vượt quá: ${foreignPlayerCount} (tối đa: ${REQUIREMENTS.MAX_FOREIGN_PLAYERS_REGISTRATION})`;
    checks.foreignPlayerCount = {
      passed: false,
      message,
      currentCount: foreignPlayerCount,
    };
    errors.push(message);
  }

  // 5. Check player age (minimum 16 years old)
  const ageViolationsResult = await query<{
    player_id: number;
    full_name: string;
    date_of_birth: string;
    age: number;
  }>(
    `
    SELECT 
      p.player_id,
      p.full_name,
      p.date_of_birth,
      DATEDIFF(YEAR, p.date_of_birth, GETDATE()) AS age
    FROM season_player_registrations spr
    INNER JOIN season_team_participants stp ON spr.season_team_id = stp.season_team_id
    INNER JOIN players p ON spr.player_id = p.player_id
    WHERE stp.season_id = @seasonId
      AND stp.team_id = @teamId
      AND spr.registration_status IN ('pending', 'approved')
      AND DATEDIFF(YEAR, p.date_of_birth, GETDATE()) < @minAge
    `,
    { seasonId: input.seasonId, teamId: input.teamId, minAge: REQUIREMENTS.MIN_PLAYER_AGE }
  );

  const ageViolations = ageViolationsResult.recordset.map((row) => ({
    playerId: row.player_id,
    playerName: row.full_name,
    age: row.age,
  }));

  if (ageViolations.length === 0) {
    checks.playerAge = {
      passed: true,
      message: `Tất cả cầu thủ đều đủ tuổi (tối thiểu: ${REQUIREMENTS.MIN_PLAYER_AGE} tuổi)`,
    };
  } else {
    const violationList = ageViolations.map((v) => `${v.playerName} (${v.age} tuổi)`).join(", ");
    checks.playerAge = {
      passed: false,
      message: `Có cầu thủ chưa đủ tuổi (tối thiểu: ${REQUIREMENTS.MIN_PLAYER_AGE} tuổi): ${violationList}`,
      violations: ageViolations,
    };
    errors.push(checks.playerAge.message);
  }

  // 6. Check stadium capacity (minimum 10,000 seats)
  if (input.stadiumCapacity !== null && input.stadiumCapacity !== undefined) {
    if (input.stadiumCapacity >= REQUIREMENTS.MIN_STADIUM_CAPACITY) {
      checks.stadiumCapacity = {
        passed: true,
        message: `Sức chứa sân nhà hợp lệ: ${input.stadiumCapacity.toLocaleString("vi-VN")} chỗ (tối thiểu: ${REQUIREMENTS.MIN_STADIUM_CAPACITY.toLocaleString("vi-VN")})`,
        currentCapacity: input.stadiumCapacity,
      };
    } else {
      checks.stadiumCapacity = {
        passed: false,
        message: `Sức chứa sân nhà không đủ: ${input.stadiumCapacity.toLocaleString("vi-VN")} chỗ (tối thiểu: ${REQUIREMENTS.MIN_STADIUM_CAPACITY.toLocaleString("vi-VN")})`,
        currentCapacity: input.stadiumCapacity,
      };
      errors.push(checks.stadiumCapacity.message);
    }
  } else {
    checks.stadiumCapacity = {
      passed: false,
      message: "Chưa có thông tin sức chứa sân nhà",
    };
    errors.push(checks.stadiumCapacity.message);
  }

  // 7. Check stadium rating (minimum 2 stars)
  if (input.stadiumRating !== null && input.stadiumRating !== undefined) {
    if (input.stadiumRating >= REQUIREMENTS.MIN_STADIUM_RATING) {
      checks.stadiumRating = {
        passed: true,
        message: `Hạng sân nhà hợp lệ: ${input.stadiumRating} sao (tối thiểu: ${REQUIREMENTS.MIN_STADIUM_RATING} sao FIFA)`,
        currentRating: input.stadiumRating,
      };
    } else {
      checks.stadiumRating = {
        passed: false,
        message: `Hạng sân nhà không đạt: ${input.stadiumRating} sao (tối thiểu: ${REQUIREMENTS.MIN_STADIUM_RATING} sao FIFA)`,
        currentRating: input.stadiumRating,
      };
      errors.push(checks.stadiumRating.message);
    }
  } else {
    checks.stadiumRating = {
      passed: false,
      message: "Chưa có thông tin hạng sân nhà",
    };
    errors.push(checks.stadiumRating.message);
  }

  // 8. Check stadium location (must be in Vietnam)
  const isStadiumInVietnam =
    input.stadiumCountry?.toLowerCase().includes("vietnam") ||
    input.stadiumCountry?.toLowerCase().includes("việt nam") ||
    input.stadiumCountry === "VN";

  if (isStadiumInVietnam || (input.stadiumCity && !input.stadiumCountry)) {
    // If city is provided but country is not, assume it's in Vietnam if city is Vietnamese
    checks.stadiumLocation = {
      passed: true,
      message: "Sân bóng nằm tại Việt Nam",
    };
  } else if (!input.stadiumCountry) {
    checks.stadiumLocation = {
      passed: false,
      message: "Chưa có thông tin vị trí sân bóng",
    };
    errors.push(checks.stadiumLocation.message);
  } else {
    checks.stadiumLocation = {
      passed: false,
      message: `Sân bóng phải nằm tại Việt Nam (hiện tại: ${input.stadiumCountry})`,
    };
    errors.push(checks.stadiumLocation.message);
  }

  return {
    isEligible: errors.length === 0,
    errors,
    warnings,
    checks,
  };
}

/**
 * Get team and stadium information for eligibility check
 */
export async function getTeamEligibilityData(
  teamId: number,
  seasonId: number
): Promise<{
  teamId: number;
  teamName: string;
  governingBody: string | null;
  country: string | null;
  stadiumId: number | null;
  stadiumCapacity: number | null;
  stadiumRating: number | null;
  stadiumCity: string | null;
  stadiumCountry: string | null;
}> {
  const result = await query<{
    team_id: number;
    team_name: string;
    governing_body: string | null;
    country: string | null;
    stadium_id: number | null;
    capacity: number | null;
    rating_stars: number | null;
    city: string | null;
    province: string | null;
  }>(
    `
    SELECT 
      t.team_id,
      t.name AS team_name,
      t.governing_body,
      t.country,
      t.home_stadium_id AS stadium_id,
      s.capacity,
      s.rating_stars,
      s.city,
      s.province
    FROM teams t
    LEFT JOIN stadiums s ON t.home_stadium_id = s.stadium_id
    WHERE t.team_id = @teamId
    `,
    { teamId }
  );

  const row = result.recordset[0];
  if (!row) {
    throw BadRequestError("Team not found");
  }

  // Stadiums are assumed to be in Vietnam if they exist (since teams are Vietnamese)
  // If we need to explicitly track this, we'd need a migration to add country field to stadiums
  return {
    teamId: row.team_id,
    teamName: row.team_name,
    governingBody: row.governing_body,
    country: row.country,
    stadiumId: row.stadium_id,
    stadiumCapacity: row.capacity,
    stadiumRating: row.rating_stars,
    stadiumCity: row.city || row.province,
    stadiumCountry: "Vietnam", // Assume Vietnam since stadiums table doesn't have country field
  };
}

/**
 * Check if governing body is in Vietnam (heuristic check)
 */
export function checkGoverningBodyInVietnam(
  governingBody: string | null,
  country: string | null
): boolean {
  if (!governingBody && !country) {
    return false;
  }

  const checkString = `${governingBody || ""} ${country || ""}`.toLowerCase();
  return (
    checkString.includes("vietnam") ||
    checkString.includes("việt nam") ||
    checkString.includes("vn") ||
    (country?.toLowerCase().includes("vietnam") ?? false) ||
    (country?.toLowerCase().includes("việt nam") ?? false)
  );
}

