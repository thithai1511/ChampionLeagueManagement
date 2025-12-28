import { query } from "../db/sqlServer";
import {
  TeamSummary,
  TeamDetail,
  getCompetitionTeams,
  getTeamDetail,
} from "./footballDataService";

export interface TeamRecord {
  id: number;
  externalId: number;
  name: string;
  shortName: string | null;
  tla: string | null;
  logo: string | null;
  crest: string | null;
  country: string | null;
  countryCode: string | null;
  countryFlag: string | null;
  venue: string | null;
  clubColors: string | null;
  founded: number | null;
  coach: string | null;
  coachNationality: string | null;
  website: string | null;
  address: string | null;
  season: string | null;
  updatedAt: string;
  runningCompetitions?: Array<{
    id: number;
    name: string;
    code?: string;
    type?: string;
  }>;
}

export interface TeamFilters {
  search?: string;
  country?: string;
  season?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedTeams {
  data: TeamRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const upsertTeam = async (team: TeamSummary): Promise<void> => {
  await query(
    `
      MERGE dbo.FootballTeams AS target
      USING (VALUES (@externalId, @season)) AS source(external_id, season)
      ON target.external_id = source.external_id 
         AND (target.season = source.season OR (target.season IS NULL AND source.season IS NULL))
      WHEN MATCHED THEN
        UPDATE SET
          target.name = @name,
          target.short_name = @shortName,
          target.tla = @tla,
          target.logo = @logo,
          target.crest = @crest,
          target.country = @country,
          target.country_code = @countryCode,
          target.country_flag = @countryFlag,
          target.venue = @venue,
          target.club_colors = @clubColors,
          target.founded = @founded,
          target.coach = @coach,
          target.coach_nationality = @coachNationality,
          target.website = @website,
          target.address = @address,
          target.updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (
          external_id,
          name,
          short_name,
          tla,
          logo,
          crest,
          country,
          country_code,
          country_flag,
          venue,
          club_colors,
          founded,
          coach,
          coach_nationality,
          website,
          address,
          season
        )
        VALUES (
          @externalId,
          @name,
          @shortName,
          @tla,
          @logo,
          @crest,
          @country,
          @countryCode,
          @countryFlag,
          @venue,
          @clubColors,
          @founded,
          @coach,
          @coachNationality,
          @website,
          @address,
          @season
        );
    `,
    {
      externalId: team.id,
      name: team.name,
      shortName: team.shortName ?? null,
      tla: team.tla ?? null,
      logo: team.logo ?? null,
      crest: team.crest ?? null,
      country: team.country ?? null,
      countryCode: team.countryCode ?? null,
      countryFlag: team.countryFlag ?? null,
      venue: team.venue ?? null,
      clubColors: team.clubColors ?? null,
      founded: team.founded ?? null,
      coach: team.coach ?? null,
      coachNationality: team.coachNationality ?? null,
      website: team.website ?? null,
      address: team.address ?? null,
      season: team.season ?? null,
    },
  );

  // Get the team's internal ID for competitions
  const teamResult = await query<{ id: number }>(
    "SELECT id FROM dbo.FootballTeams WHERE external_id = @externalId AND (season = @season OR (season IS NULL AND @season IS NULL))",
    { externalId: team.id, season: team.season ?? null },
  );

  const teamInternalId = teamResult.recordset[0]?.id;
  if (!teamInternalId) {
    return;
  }

  // Delete old competitions and insert new ones
  await query(
    "DELETE FROM dbo.FootballTeamCompetitions WHERE team_id = @teamId AND (season = @season OR (season IS NULL AND @season IS NULL))",
    { teamId: teamInternalId, season: team.season ?? null },
  );

  for (const competition of team.runningCompetitions ?? []) {
    await query(
      `
        INSERT INTO dbo.FootballTeamCompetitions (
          team_id,
          season,
          competition_id,
          competition_name,
          competition_code,
          competition_type
        )
        VALUES (
          @teamId,
          @season,
          @competitionId,
          @competitionName,
          @competitionCode,
          @competitionType
        );
      `,
      {
        teamId: teamInternalId,
        season: team.season ?? null,
        competitionId: competition.id,
        competitionName: competition.name,
        competitionCode: competition.code ?? null,
        competitionType: competition.type ?? null,
      },
    );
  }
};

export const syncTeamsFromUpstream = async (season?: string): Promise<{
  season: string | undefined;
  totalTeams: number;
}> => {
  const teams = await getCompetitionTeams(season);

  for (const team of teams) {
    await upsertTeam(team);
  }

  return {
    season,
    totalTeams: teams.length,
  };
};

export const listTeams = async (filters: TeamFilters = {}): Promise<PaginatedTeams> => {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit
    ? Math.min(Math.max(filters.limit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const parameters: Record<string, unknown> = {
    offset,
    limit,
  };

  if (filters.search) {
    conditions.push(
      "(LOWER(name) LIKE LOWER(@search) OR LOWER(short_name) LIKE LOWER(@search) OR LOWER(tla) LIKE LOWER(@search))",
    );
    parameters.search = `%${filters.search.trim()}%`;
  }

  if (filters.country) {
    if (filters.country.toLowerCase() !== "all") {
      conditions.push(
        "(LOWER(country) LIKE LOWER(@country) OR LOWER(country_code) = LOWER(@countryCode))",
      );
      parameters.country = `%${filters.country.trim()}%`;
      parameters.countryCode = filters.country.trim();
    }
  }

  if (filters.season) {
    conditions.push("season = @season");
    parameters.season = filters.season.trim();
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const dataResult = await query<TeamRecord>(
    `
      SELECT
        id,
        external_id AS externalId,
        name,
        short_name AS shortName,
        tla,
        logo,
        crest,
        country,
        country_code AS countryCode,
        country_flag AS countryFlag,
        venue,
        club_colors AS clubColors,
        founded,
        coach,
        coach_nationality AS coachNationality,
        website,
        address,
        season,
        CONVERT(VARCHAR(33), updated_at, 127) AS updatedAt
      FROM dbo.FootballTeams
      ${whereClause}
      ORDER BY name ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `,
    parameters,
  );

  const countResult = await query<{ total: number }>(
    `
      SELECT COUNT(1) AS total
      FROM dbo.FootballTeams
      ${whereClause};
    `,
    parameters,
  );

  const total = countResult.recordset[0]?.total ?? 0;
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

  // Fetch running competitions for each team
  const teamsWithCompetitions = await Promise.all(
    dataResult.recordset.map(async (team) => {
      const competitionsResult = await query<{
        competitionId: number;
        competitionName: string;
        competitionCode: string | null;
        competitionType: string | null;
      }>(
        `
          SELECT
            competition_id AS competitionId,
            competition_name AS competitionName,
            competition_code AS competitionCode,
            competition_type AS competitionType
          FROM dbo.FootballTeamCompetitions
          WHERE team_id = @teamId AND (season = @season OR (season IS NULL AND @season IS NULL));
        `,
        { teamId: team.id, season: team.season },
      );

      return {
        ...team,
        runningCompetitions: competitionsResult.recordset.map((c) => ({
          id: c.competitionId,
          name: c.competitionName,
          code: c.competitionCode ?? undefined,
          type: c.competitionType ?? undefined,
        })),
      };
    }),
  );

  return {
    data: teamsWithCompetitions,
    total,
    page,
    limit,
    totalPages,
  };
};

export const getTeamById = async (id: number): Promise<TeamRecord | null> => {
  const result = await query<TeamRecord>(
    `
      SELECT
        id,
        external_id AS externalId,
        name,
        short_name AS shortName,
        tla,
        logo,
        crest,
        country,
        country_code AS countryCode,
        country_flag AS countryFlag,
        venue,
        club_colors AS clubColors,
        founded,
        coach,
        coach_nationality AS coachNationality,
        website,
        address,
        season,
        CONVERT(VARCHAR(33), updated_at, 127) AS updatedAt
      FROM dbo.FootballTeams
      WHERE id = @id;
    `,
    { id },
  );

  const team = result.recordset[0];
  if (!team) {
    return null;
  }

  // Fetch running competitions
  const competitionsResult = await query<{
    competitionId: number;
    competitionName: string;
    competitionCode: string | null;
    competitionType: string | null;
  }>(
    `
      SELECT
        competition_id AS competitionId,
        competition_name AS competitionName,
        competition_code AS competitionCode,
        competition_type AS competitionType
      FROM dbo.FootballTeamCompetitions
      WHERE team_id = @teamId;
    `,
    { teamId: team.id },
  );

  return {
    ...team,
    runningCompetitions: competitionsResult.recordset.map((c) => ({
      id: c.competitionId,
      name: c.competitionName,
      code: c.competitionCode ?? undefined,
      type: c.competitionType ?? undefined,
    })),
  };
};

export const getTeamByExternalId = async (
  externalId: number,
  season?: string,
): Promise<TeamRecord | null> => {
  const result = await query<TeamRecord>(
    `
      SELECT
        id,
        external_id AS externalId,
        name,
        short_name AS shortName,
        tla,
        logo,
        crest,
        country,
        country_code AS countryCode,
        country_flag AS countryFlag,
        venue,
        club_colors AS clubColors,
        founded,
        coach,
        coach_nationality AS coachNationality,
        website,
        address,
        season,
        CONVERT(VARCHAR(33), updated_at, 127) AS updatedAt
      FROM dbo.FootballTeams
      WHERE external_id = @externalId 
        AND (season = @season OR (season IS NULL AND @season IS NULL))
      ORDER BY updated_at DESC;
    `,
    { externalId, season: season ?? null },
  );

  const team = result.recordset[0];
  if (!team) {
    return null;
  }

  // Fetch running competitions
  const competitionsResult = await query<{
    competitionId: number;
    competitionName: string;
    competitionCode: string | null;
    competitionType: string | null;
  }>(
    `
      SELECT
        competition_id AS competitionId,
        competition_name AS competitionName,
        competition_code AS competitionCode,
        competition_type AS competitionType
      FROM dbo.FootballTeamCompetitions
      WHERE team_id = @teamId;
    `,
    { teamId: team.id },
  );

  return {
    ...team,
    runningCompetitions: competitionsResult.recordset.map((c) => ({
      id: c.competitionId,
      name: c.competitionName,
      code: c.competitionCode ?? undefined,
      type: c.competitionType ?? undefined,
    })),
  };
};

/**
 * Get internal team by team_id from teams table
 * This includes all custom fields like phone, email, stadium_name, etc.
 */
export const getInternalTeamById = async (teamId: number): Promise<any | null> => {
  console.log('[getInternalTeamById] Fetching team:', teamId);
  
  const result = await query(
    `
      SELECT
        team_id,
        name,
        short_name,
        code,
        governing_body,
        city,
        country,
        home_stadium_id,
        founded_year,
        description,
        home_kit_description,
        phone,
        email,
        stadium_name,
        stadium_capacity,
        website,
        status,
        created_at,
        updated_at
      FROM teams
      WHERE team_id = @teamId;
    `,
    { teamId },
  );

  const team = result.recordset[0] || null;
  console.log('[getInternalTeamById] Result:', team ? 'Found' : 'Not found', team ? Object.keys(team) : []);
  
  return team;
};

export const updateTeam = async (
  id: number,
  payload: Partial<
    Pick<
      TeamRecord,
      | "name"
      | "shortName"
      | "tla"
      | "venue"
      | "clubColors"
      | "founded"
      | "coach"
      | "coachNationality"
      | "website"
      | "address"
    >
  > & {
    // Additional fields from teams table schema
    code?: string | null;
    city?: string | null;
    country?: string | null;
    founded_year?: number | null;
    description?: string | null;
    governing_body?: string | null;
    home_kit_description?: string | null;
  },
): Promise<TeamRecord | null> => {
  console.log('[updateTeam] Called with id:', id, 'payload:', payload);
  
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };

  if (payload.name !== undefined) {
    fields.push("name = @name");
    params.name = payload.name.trim();
  }
  if (payload.shortName !== undefined) {
    fields.push("short_name = @shortName");
    params.shortName = payload.shortName ? payload.shortName.trim() : null;
  }
  if (payload.code !== undefined) {
    fields.push("code = @code");
    params.code = payload.code ? payload.code.trim() : null;
  }
  if (payload.city !== undefined) {
    fields.push("city = @city");
    params.city = payload.city ? payload.city.trim() : null;
  }
  if (payload.country !== undefined) {
    fields.push("country = @country");
    params.country = payload.country ? payload.country.trim() : null;
  }
  if (payload.founded_year !== undefined) {
    fields.push("founded_year = @founded_year");
    params.founded_year = payload.founded_year ?? null;
  }
  if (payload.description !== undefined) {
    fields.push("description = @description");
    params.description = payload.description ? payload.description.trim() : null;
  }
  if (payload.governing_body !== undefined) {
    fields.push("governing_body = @governing_body");
    params.governing_body = payload.governing_body ? payload.governing_body.trim() : null;
  }
  if (payload.home_kit_description !== undefined) {
    fields.push("home_kit_description = @home_kit_description");
    params.home_kit_description = payload.home_kit_description ? payload.home_kit_description.trim() : null;
  }
  if (payload.tla !== undefined) {
    fields.push("tla = @tla");
    params.tla = payload.tla ? payload.tla.trim() : null;
  }
  if (payload.venue !== undefined) {
    fields.push("venue = @venue");
    params.venue = payload.venue ? payload.venue.trim() : null;
  }
  if (payload.clubColors !== undefined) {
    fields.push("club_colors = @clubColors");
    params.clubColors = payload.clubColors ? payload.clubColors.trim() : null;
  }
  if (payload.founded !== undefined) {
    fields.push("founded = @founded");
    params.founded = payload.founded ?? null;
  }
  if (payload.coach !== undefined) {
    fields.push("coach = @coach");
    params.coach = payload.coach ? payload.coach.trim() : null;
  }
  if (payload.coachNationality !== undefined) {
    fields.push("coach_nationality = @coachNationality");
    params.coachNationality = payload.coachNationality
      ? payload.coachNationality.trim()
      : null;
  }
  if (payload.website !== undefined) {
    fields.push("website = @website");
    params.website = payload.website ? payload.website.trim() : null;
  }
  if (payload.address !== undefined) {
    fields.push("address = @address");
    params.address = payload.address ? payload.address.trim() : null;
  }
  
  // New fields from migration
  if ((payload as any).phone !== undefined) {
    fields.push("phone = @phone");
    params.phone = (payload as any).phone ? (payload as any).phone.trim() : null;
  }
  if ((payload as any).email !== undefined) {
    fields.push("email = @email");
    params.email = (payload as any).email ? (payload as any).email.trim() : null;
  }
  if ((payload as any).stadium_name !== undefined) {
    fields.push("stadium_name = @stadium_name");
    params.stadium_name = (payload as any).stadium_name ? (payload as any).stadium_name.trim() : null;
  }
  if ((payload as any).stadium_capacity !== undefined) {
    fields.push("stadium_capacity = @stadium_capacity");
    params.stadium_capacity = (payload as any).stadium_capacity ?? null;
  }

  if (fields.length === 0) {
    console.log('[updateTeam] No fields to update, returning current data');
    return getInternalTeamById(id);
  }

  fields.push("updated_at = SYSUTCDATETIME()");
  
  const updateQuery = `
    UPDATE teams
    SET ${fields.join(", ")}
    WHERE team_id = @id;
  `;
  
  console.log('[updateTeam] Executing UPDATE query:', updateQuery);
  console.log('[updateTeam] With params:', params);

  await query(updateQuery, params);
  
  console.log('[updateTeam] UPDATE completed, fetching updated data...');
  const result = await getInternalTeamById(id);
  console.log('[updateTeam] Returning updated team');
  
  return result;
};

export const deleteTeam = async (id: number): Promise<boolean> => {
  // First, check for references to give informative error message
  const refCheckResult = await query<{
    table_name: string;
    ref_count: number;
  }>(
    `
    SELECT 'season_team_participants' AS table_name, COUNT(*) AS ref_count 
    FROM season_team_participants WHERE team_id = @id
    UNION ALL
    SELECT 'season_invitations', COUNT(*) FROM season_invitations WHERE team_id = @id
    UNION ALL
    SELECT 'season_team_registrations', COUNT(*) FROM season_team_registrations WHERE team_id = @id
    UNION ALL
    SELECT 'team_kits', COUNT(*) FROM team_kits WHERE team_id = @id
    UNION ALL
    SELECT 'players', COUNT(*) FROM players WHERE current_team_id = @id
    UNION ALL
    SELECT 'user_team_assignments', COUNT(*) FROM user_team_assignments WHERE team_id = @id
    `,
    { id }
  );
  
  const references: string[] = [];
  for (const row of refCheckResult.recordset || []) {
    if (row.ref_count > 0) {
      const tableName = row.table_name;
      const count = row.ref_count;
      switch (tableName) {
        case 'season_team_participants':
          references.push(`${count} mùa giải tham gia`);
          break;
        case 'season_invitations':
          references.push(`${count} lời mời giải đấu`);
          break;
        case 'season_team_registrations':
          references.push(`${count} đăng ký giải đấu`);
          break;
        case 'team_kits':
          references.push(`${count} bộ đồng phục`);
          break;
        case 'players':
          references.push(`${count} cầu thủ`);
          break;
        case 'user_team_assignments':
          references.push(`${count} quản trị viên đội`);
          break;
        default:
          references.push(`${count} tham chiếu từ ${tableName}`);
      }
    }
  }

  // Log the references found
  if (references.length > 0) {
    console.log(`[deleteTeam] Team ${id} has references: ${references.join(', ')}`);
  }

  // Cascading delete implementation

  // 1. Delete detailed match data for matches involving this team
  // Identifying matches first to target dependent tables
  // We uses season_team_participants to link team_id -> season_team_id -> matches
  const matchSubquery = `
    SELECT match_id FROM matches 
    WHERE home_season_team_id IN (SELECT season_team_id FROM season_team_participants WHERE team_id = @id) 
       OR away_season_team_id IN (SELECT season_team_id FROM season_team_participants WHERE team_id = @id)
  `;

  try {
    await query(
      `
      DELETE FROM match_events WHERE match_id IN (${matchSubquery});
      DELETE FROM match_mvps WHERE match_id IN (${matchSubquery});
      DELETE FROM match_team_statistics WHERE match_id IN (${matchSubquery});
      DELETE FROM match_audit_logs WHERE match_id IN (${matchSubquery});
      DELETE FROM match_lineup_players WHERE lineup_id IN (SELECT lineup_id FROM match_lineups WHERE match_id IN (${matchSubquery}));
      DELETE FROM match_lineups WHERE match_id IN (${matchSubquery});
      DELETE FROM match_official_assignments WHERE match_id IN (${matchSubquery});
      DELETE FROM match_reports WHERE match_id IN (${matchSubquery});
      DELETE FROM player_match_stats WHERE match_id IN (${matchSubquery});
      `,
      { id }
    );

    // 2. Delete the matches themselves
    await query(
      `DELETE FROM matches 
       WHERE home_season_team_id IN (SELECT season_team_id FROM season_team_participants WHERE team_id = @id) 
          OR away_season_team_id IN (SELECT season_team_id FROM season_team_participants WHERE team_id = @id);`,
      { id }
    );

    // 3. Delete season participation data
    // Delete statistics and player registrations first as they reference season_team_participants
    await query(
      `
      DELETE FROM season_team_statistics WHERE season_team_id IN (SELECT season_team_id FROM season_team_participants WHERE team_id = @id);
      DELETE FROM season_player_registrations WHERE season_team_id IN (SELECT season_team_id FROM season_team_participants WHERE team_id = @id);
      `,
      { id }
    );

    // 4. Delete season participation
    // This must be done after matches because matches reference season_team_participants
    await query(
      "DELETE FROM season_team_participants WHERE team_id = @id;",
      { id }
    );

    // 5. Delete direct team dependencies
    await query(
      `
      DELETE FROM season_invitations WHERE team_id = @id;
      DELETE FROM season_team_registrations WHERE team_id = @id;
      DELETE FROM team_kits WHERE team_id = @id;
      UPDATE players SET current_team_id = NULL WHERE current_team_id = @id;
      DELETE FROM user_team_assignments WHERE team_id = @id;
      DELETE FROM FootballTeamCompetitions WHERE team_id = @id;
      `,
      { id }
    );

    // 6. Finally delete the team (try both generic and internal tables)
    // We use a transaction-like approach or just best-effort delete for both.
    const result = await query<{ rowsAffected: number }>(
      `
      DELETE FROM dbo.FootballTeams WHERE id = @id;
      DELETE FROM teams WHERE team_id = @id;
      `,
      { id },
    );
    const rowsAffected = result.rowsAffected?.[0] ?? 0;
    return rowsAffected > 0;
  } catch (error: any) {
    // If we still hit a FK constraint error, provide detailed message
    if (error?.number === 547) {
      const refInfo = references.length > 0 
        ? `Đội bóng có liên kết với: ${references.join(', ')}. `
        : '';
      throw new Error(`Không thể xóa đội bóng. ${refInfo}Vui lòng liên hệ quản trị viên hệ thống nếu vẫn gặp lỗi này.`);
    }
    throw error;
  }
};

