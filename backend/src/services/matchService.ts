import { query } from "../db/sqlServer";
import { getCompetitionMatches, type MatchSummary } from "./footballDataService";
import { calculateStandings } from "./standingsAdminService";

class NotificationService {
  static async notifyMatchScheduleChange(
    match: any,
    changes: { oldDate?: string; newDate?: string; oldStadium?: string; newStadium?: string; }
  ): Promise<void> {
    console.log(`[NotificationService] 🔔 ALERT: Match ${match.homeTeamName} vs ${match.awayTeamName} changed!`);
    if (changes.newDate) console.log(`[NotificationService] 📅 Date changed from ${changes.oldDate} to ${changes.newDate}`);
    if (changes.newStadium) console.log(`[NotificationService] 🏟️ Stadium moved from ${changes.oldStadium} to ${changes.newStadium}`);
  }
}

export interface DraftMatch {
  seasonId: number;
  matchday: number;
  homeTeamId: number;
  awayTeamId: number;
  utcDate: string;
  venue?: string;
  status: string;
  homeSeasonTeamId?: number;
  awaySeasonTeamId?: number;
  homeTeamName?: string;
  awayTeamName?: string;
  roundNumber?: number;
}

export interface MatchRecord {
  matchId: number;
  seasonId: number;
  roundId: number;
  matchdayNumber: number;
  homeTeamId: number;
  homeTeamName: string;
  homeTeamLogo: string | null;
  homeTeamShortName: string | null;
  awayTeamId: number;
  awayTeamName: string;
  awayTeamLogo: string | null;
  awayTeamShortName: string | null; stadiumId: number;
  stadiumName: string | null;
  scheduledKickoff: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  attendance: number | null;
  matchCode: string | null;
  updatedAt: string | null;
  // New Fields
  mvp: { playerName: string; teamName: string } | null;
  events: Array<{
    id: number;
    teamId: number;
    player: string;
    type: string;
    minute: number;
    description: string | null;
  }>;
  stats: {
    home: { possession: number; shots: number; onTarget: number; corners: number; fouls: number } | null;
    away: { possession: number; shots: number; onTarget: number; corners: number; fouls: number } | null;
  };
}

export interface MatchFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  teamId?: number;
  seasonId?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedMatches {
  data: MatchRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateMatchInput {
  homeTeamId: number;
  awayTeamId: number;
  scheduledKickoff: string;
  seasonId?: number;
  roundNumber?: number;
  matchdayNumber?: number;
  stadiumId?: number;
  status?: string;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Helper: Ensure default season exists
const ensureDefaultSeason = async (): Promise<number> => {
  const existingSeason = await query<{ season_id: number }>(
    `SELECT TOP 1 season_id FROM seasons ORDER BY created_at DESC`
  );

  if (existingSeason.recordset.length > 0) {
    return existingSeason.recordset[0].season_id;
  }

  // Create default tournament first
  const tournamentResult = await query<{ tournament_id: number }>(
    `
      IF NOT EXISTS (SELECT 1 FROM tournaments WHERE code = 'DEFAULT')
      BEGIN
        INSERT INTO tournaments (code, name, organizer, region)
        OUTPUT INSERTED.tournament_id
        VALUES ('DEFAULT', 'Default Tournament', 'System', 'International');
      END
      ELSE
      BEGIN
        SELECT tournament_id FROM tournaments WHERE code = 'DEFAULT';
      END
    `
  );

  const tournamentId = tournamentResult.recordset[0].tournament_id;

  // Create default ruleset
  const rulesetResult = await query<{ ruleset_id: number }>(
    `
      IF NOT EXISTS (SELECT 1 FROM rulesets WHERE name = 'Standard Rules')
      BEGIN
        INSERT INTO rulesets (name, version_tag, is_active, created_by)
        OUTPUT INSERTED.ruleset_id
        VALUES ('Standard Rules', '1.0', 1, 1);
      END
      ELSE
      BEGIN
        SELECT ruleset_id FROM rulesets WHERE name = 'Standard Rules';
      END
    `
  );

  const rulesetId = rulesetResult.recordset[0].ruleset_id;

  // Create default season
  const seasonResult = await query<{ season_id: number }>(
    `
      INSERT INTO seasons (
        tournament_id, ruleset_id, name, code, 
        start_date, participation_fee, created_by, status
      )
      OUTPUT INSERTED.season_id
      VALUES (
        @tournamentId, @rulesetId, 'Season ' + CAST(YEAR(GETDATE()) AS VARCHAR), 
        'S' + CAST(YEAR(GETDATE()) AS VARCHAR),
        GETDATE(), 0, 1, 'in_progress'
      );
    `,
    { tournamentId, rulesetId }
  );

  return seasonResult.recordset[0].season_id;
};

// Helper: Ensure round exists for season
const ensureRoundForSeason = async (seasonId: number, roundNumber?: number): Promise<number> => {
  const roundNum = roundNumber || 1;

  const existingRound = await query<{ round_id: number }>(
    `SELECT round_id FROM season_rounds WHERE season_id = @seasonId AND round_number = @roundNum`,
    { seasonId, roundNum }
  );

  if (existingRound.recordset.length > 0) {
    return existingRound.recordset[0].round_id;
  }

  const roundResult = await query<{ round_id: number }>(
    `
      INSERT INTO season_rounds (season_id, round_number, name, status)
      OUTPUT INSERTED.round_id
      VALUES (@seasonId, @roundNum, 'Round ' + CAST(@roundNum AS VARCHAR), 'planned');
    `,
    { seasonId, roundNum }
  );

  return roundResult.recordset[0].round_id;
};

// Helper: Get or create default stadium
const ensureDefaultStadium = async (): Promise<number> => {
  const existingStadium = await query<{ stadium_id: number }>(
    `SELECT TOP 1 stadium_id FROM stadiums ORDER BY created_at DESC`
  );

  if (existingStadium.recordset.length > 0) {
    return existingStadium.recordset[0].stadium_id;
  }

  const stadiumResult = await query<{ stadium_id: number }>(
    `
      INSERT INTO stadiums (name, city, capacity, is_certified)
      OUTPUT INSERTED.stadium_id
      VALUES ('Default Stadium', 'Default City', 50000, 1);
    `
  );

  return stadiumResult.recordset[0].stadium_id;
};

// Helper: Ensure team is registered in season
const ensureTeamInSeason = async (teamId: number, seasonId: number): Promise<number> => {
  const existing = await query<{ season_team_id: number }>(
    `SELECT season_team_id FROM season_team_participants 
     WHERE season_id = @seasonId AND team_id = @teamId`,
    { seasonId, teamId }
  );

  if (existing.recordset.length > 0) {
    return existing.recordset[0].season_team_id;
  }

  const result = await query<{ season_team_id: number }>(
    `
      INSERT INTO season_team_participants (season_id, team_id, status)
      OUTPUT INSERTED.season_team_id
      VALUES (@seasonId, @teamId, 'active');
    `,
    { seasonId, teamId }
  );

  return result.recordset[0].season_team_id;
};

export const createMatch = async (input: CreateMatchInput): Promise<MatchRecord> => {
  const seasonId = input.seasonId || await ensureDefaultSeason();
  const roundId = await ensureRoundForSeason(seasonId, input.roundNumber);
  const stadiumId = input.stadiumId || await ensureDefaultStadium();

  const homeSeasonTeamId = await ensureTeamInSeason(input.homeTeamId, seasonId);
  const awaySeasonTeamId = await ensureTeamInSeason(input.awayTeamId, seasonId);

  const rulesetResult = await query<{ ruleset_id: number }>(
    `SELECT ruleset_id FROM seasons WHERE season_id = @seasonId`,
    { seasonId }
  );
  const rulesetId = rulesetResult.recordset[0].ruleset_id;

  const matchResult = await query<{ match_id: number }>(
    `
      INSERT INTO matches (
        season_id, round_id, matchday_number,
        home_season_team_id, away_season_team_id,
        stadium_id, ruleset_id, scheduled_kickoff, status
      )
      OUTPUT INSERTED.match_id
      VALUES (
        @seasonId, @roundId, @matchdayNumber,
        @homeSeasonTeamId, @awaySeasonTeamId,
        @stadiumId, @rulesetId, @scheduledKickoff, @status
      );
    `,
    {
      seasonId,
      roundId,
      matchdayNumber: input.matchdayNumber || 1,
      homeSeasonTeamId,
      awaySeasonTeamId,
      stadiumId,
      rulesetId,
      scheduledKickoff: input.scheduledKickoff,
      status: input.status || 'scheduled'
    }
  );

  const matchId = matchResult.recordset[0].match_id;
  const created = await getMatchById(matchId);

  if (!created) {
    throw new Error("Failed to retrieve newly created match");
  }

  return created;
};

export const listMatches = async (filters: MatchFilters = {}): Promise<PaginatedMatches> => {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit
    ? Math.min(Math.max(filters.limit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: Record<string, unknown> = { offset, limit };

  if (filters.status) {
    conditions.push("m.status = @status");
    params.status = filters.status;
  }
  if (filters.seasonId) {
    conditions.push("m.season_id = @seasonId");
    params.seasonId = filters.seasonId;
  }
  if (filters.search) {
    conditions.push("(ht.name LIKE @search OR at.name LIKE @search)");
    params.search = `%${filters.search.trim()}%`;
  }
  if (filters.teamId) {
    conditions.push(`(
      EXISTS (SELECT 1 FROM season_team_participants stp1 
              WHERE stp1.season_team_id = m.home_season_team_id AND stp1.team_id = @teamId)
      OR
      EXISTS (SELECT 1 FROM season_team_participants stp2
              WHERE stp2.season_team_id = m.away_season_team_id AND stp2.team_id = @teamId)
    )`);
    params.teamId = filters.teamId;
  }
  if (filters.dateFrom) {
    conditions.push("m.scheduled_kickoff >= @dateFrom");
    params.dateFrom = filters.dateFrom;
  }
  if (filters.dateTo) {
    conditions.push("m.scheduled_kickoff <= @dateTo");
    params.dateTo = filters.dateTo;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const dataResult = await query(
    `
      SELECT
        m.match_id AS matchId,
        m.season_id AS seasonId,
        m.round_id AS roundId,
        m.matchday_number AS matchdayNumber,
        hstp.team_id AS homeTeamId,
        ht.name AS homeTeamName,
        ht.short_name AS homeTeamShortName,
        ht.logo_url AS homeTeamLogo,
        astp.team_id AS awayTeamId,
        at.name AS awayTeamName,
        at.short_name AS awayTeamShortName,
        at.logo_url AS awayTeamLogo,
        m.stadium_id AS stadiumId,
        s.name AS stadiumName,
        CONVERT(VARCHAR(33), m.scheduled_kickoff, 127) AS scheduledKickoff,
        m.status,
        m.home_score AS homeScore,
        m.away_score AS awayScore,
        m.attendance,
        m.match_code AS matchCode,
        CONVERT(VARCHAR(33), m.updated_at, 127) AS updatedAt,
        (SELECT TOP 1 JSON_QUERY((SELECT player_name AS playerName, team_name AS teamName FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)) FROM match_mvps WHERE match_id = m.match_id) AS mvpJson,
        (SELECT (
            SELECT 
                match_event_id AS id,
                stp.team_id AS teamId,
                player_name AS player,
                event_type AS type,
                card_type AS cardType,
                event_minute AS minute,
                description
            FROM match_events me
            INNER JOIN season_team_participants stp ON me.season_team_id = stp.season_team_id
            WHERE me.match_id = m.match_id 
            ORDER BY me.event_minute ASC 
            FOR JSON PATH
        )) AS eventsJson,
        (SELECT (
            SELECT 
                stp.team_id AS teamId,
                mts.possession_percent AS possession,
                mts.shots_total AS shots,
                mts.shots_on_target AS onTarget,
                mts.corners,
                mts.fouls_committed AS fouls
            FROM match_team_statistics mts
            INNER JOIN season_team_participants stp ON mts.season_team_id = stp.season_team_id
            WHERE mts.match_id = m.match_id
            FOR JSON PATH
        )) AS statsJson
      FROM matches m
      INNER JOIN season_team_participants hstp ON m.home_season_team_id = hstp.season_team_id
      INNER JOIN teams ht ON hstp.team_id = ht.team_id
      INNER JOIN season_team_participants astp ON m.away_season_team_id = astp.season_team_id
      INNER JOIN teams at ON astp.team_id = at.team_id
      LEFT JOIN stadiums s ON m.stadium_id = s.stadium_id
      ${whereClause}
      ORDER BY m.scheduled_kickoff ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `,
    params
  );

  // Helper to parse JSON safely
  const parseJSON = (str: any) => {
    try {
      return typeof str === 'string' ? JSON.parse(str) : str;
    } catch (e) {
      return null;
    }
  };

  const matches: MatchRecord[] = dataResult.recordset.map((row: any) => {
    const rawEvents = parseJSON(row.eventsJson) || [];
    const rawStats = parseJSON(row.statsJson) || [];
    const rawMvp = parseJSON(row.mvpJson);

    // Map stats array to home/away object
    const homeStats = rawStats.find((s: any) => s.teamId === row.homeTeamId) || null;
    const awayStats = rawStats.find((s: any) => s.teamId === row.awayTeamId) || null;

    return {
      ...row,
      mvp: rawMvp ? { playerName: rawMvp.playerName, teamName: rawMvp.teamName } : null,
      events: rawEvents,
      stats: {
        home: homeStats,
        away: awayStats
      }
    };
  });

  const countResult = await query<{ total: number }>(
    `
      SELECT COUNT(1) AS total
      FROM matches m
      INNER JOIN season_team_participants hstp ON m.home_season_team_id = hstp.season_team_id
      INNER JOIN teams ht ON hstp.team_id = ht.team_id
      INNER JOIN season_team_participants astp ON m.away_season_team_id = astp.season_team_id
      INNER JOIN teams at ON astp.team_id = at.team_id
      ${whereClause};
    `,
    params
  );

  const total = countResult.recordset[0]?.total ?? 0;
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

  return {
    data: matches,
    total,
    page,
    limit,
    totalPages
  };
};

export const getMatchById = async (matchId: number): Promise<MatchRecord | null> => {
  const result = await query(
    `
      SELECT
        m.match_id AS matchId,
        m.season_id AS seasonId,
        m.home_season_team_id AS homeSeasonTeamId,
        m.away_season_team_id AS awaySeasonTeamId,
        m.round_id AS roundId,
        m.matchday_number AS matchdayNumber,
        hstp.team_id AS homeTeamId,
        ht.name AS homeTeamName,
        ht.short_name AS homeTeamShortName,
        ht.logo_url AS homeTeamLogo,
        astp.team_id AS awayTeamId,
        at.name AS awayTeamName,
        at.short_name AS awayTeamShortName,
        at.logo_url AS awayTeamLogo,
        m.stadium_id AS stadiumId,
        s.name AS stadiumName,
        CONVERT(VARCHAR(33), m.scheduled_kickoff, 127) AS scheduledKickoff,
        m.status,
        m.home_score AS homeScore,
        m.away_score AS awayScore,
        m.attendance,
        m.match_code AS matchCode,
        CONVERT(VARCHAR(33), m.updated_at, 127) AS updatedAt,
        (SELECT TOP 1 JSON_QUERY((SELECT player_name AS playerName, team_name AS teamName FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)) FROM match_mvps WHERE match_id = m.match_id) AS mvpJson,
        (SELECT (
            SELECT 
                me.match_event_id AS id,
                stp.team_id AS teamId,
                me.player_name AS player,
                me.event_type AS type,
                me.card_type AS cardType,
                me.event_minute AS minute,
                me.description
            FROM match_events me
            INNER JOIN season_team_participants stp ON me.season_team_id = stp.season_team_id
            WHERE me.match_id = m.match_id 
            ORDER BY me.event_minute ASC 
            FOR JSON PATH
        )) AS eventsJson,
        (SELECT (
            SELECT 
                stp.team_id AS teamId,
                mts.possession_percent AS possession,
                mts.shots_total AS shots,
                mts.shots_on_target AS onTarget,
                mts.corners,
                mts.fouls_committed AS fouls
            FROM match_team_statistics mts
            INNER JOIN season_team_participants stp ON mts.season_team_id = stp.season_team_id
            WHERE mts.match_id = m.match_id
            FOR JSON PATH
        )) AS statsJson
      FROM matches m
      INNER JOIN season_team_participants hstp ON m.home_season_team_id = hstp.season_team_id
      INNER JOIN teams ht ON hstp.team_id = ht.team_id
      INNER JOIN season_team_participants astp ON m.away_season_team_id = astp.season_team_id
      INNER JOIN teams at ON astp.team_id = at.team_id
      LEFT JOIN stadiums s ON m.stadium_id = s.stadium_id
      WHERE m.match_id = @matchId;
    `,
    { matchId }
  );

  const row = (result.recordset[0] as any) || null;
  if (!row) {
    return null;
  }

  const parseJSON = (value: any) => {
    try {
      return typeof value === "string" ? JSON.parse(value) : value;
    } catch {
      return null;
    }
  };

  const rawEvents = parseJSON(row.eventsJson) || [];
  const rawStats = parseJSON(row.statsJson) || [];
  const rawMvp = parseJSON(row.mvpJson);

  const homeStats = rawStats.find((s: any) => s.teamId === row.homeTeamId) || null;
  const awayStats = rawStats.find((s: any) => s.teamId === row.awayTeamId) || null;

  return {
    ...row,
    mvp: rawMvp ? { playerName: rawMvp.playerName, teamName: rawMvp.teamName } : null,
    events: rawEvents,
    stats: {
      home: homeStats,
      away: awayStats,
    },
  } as MatchRecord;
};

export const updateMatch = async (
  matchId: number,
  payload: Partial<{
    status: string;
    homeScore: number | null;
    awayScore: number | null;
    attendance: number | null;
    scheduledKickoff: string;
    stadiumId: number;
    description: string; // Optional reason for change
  }>
): Promise<MatchRecord | null> => {
  const currentMatch = await getMatchById(matchId);
  if (!currentMatch) return null;

  const fields: string[] = [];
  const params: Record<string, unknown> = { matchId };

  console.log('[updateMatch] DEBUG: MatchId:', matchId);
  console.log('[updateMatch] DEBUG: Payload:', JSON.stringify(payload, null, 2));
  console.log('[updateMatch] DEBUG: CurrentMatch:', JSON.stringify({
    id: currentMatch.matchId,
    kickoff: currentMatch.scheduledKickoff,
    stadium: currentMatch.stadiumId
  }, null, 2));

  // Check for significant changes for auditing
  const changes = {
    date: payload.scheduledKickoff && payload.scheduledKickoff !== currentMatch.scheduledKickoff,
    stadium: payload.stadiumId && payload.stadiumId !== currentMatch.stadiumId,
    status: payload.status && payload.status !== currentMatch.status,
    score: (payload.homeScore !== undefined && payload.homeScore !== currentMatch.homeScore) || (payload.awayScore !== undefined && payload.awayScore !== currentMatch.awayScore)
  };

  if (changes.date || changes.stadium) {
    try {
      // Log rescheduling
      await query(
        `INSERT INTO match_audit_logs (match_id, action_type, old_value, new_value, details) 
        VALUES (@matchId, @actionType, @oldValue, @newValue, @details)`,
        {
          matchId,
          actionType: changes.stadium ? 'RELOCATION' : 'RESCHEDULE',
          oldValue: JSON.stringify({ kickoff: currentMatch.scheduledKickoff, stadiumId: currentMatch.stadiumId }),
          newValue: JSON.stringify({ kickoff: payload.scheduledKickoff, stadiumId: payload.stadiumId }),
          details: payload.description || 'Schedule update via API'
        }
      );
      // Send Notification
      NotificationService.notifyMatchScheduleChange(currentMatch, {
        oldDate: currentMatch.scheduledKickoff,
        newDate: payload.scheduledKickoff,
        oldStadium: currentMatch.stadiumName || undefined,
        newStadium: payload.stadiumId ? `Stadium ID ${payload.stadiumId}` : undefined
      });
    } catch (auditError) {
      console.error('[updateMatch] Failed to log audit/notify (non-fatal):', auditError);
    }
  }

  if (payload.status !== undefined) {
    fields.push("status = @status");
    params.status = payload.status;
  }
  if (payload.scheduledKickoff !== undefined) {
    fields.push("scheduled_kickoff = @scheduledKickoff");
    params.scheduledKickoff = payload.scheduledKickoff;
  }
  if (payload.stadiumId !== undefined) {
    fields.push("stadium_id = @stadiumId");
    params.stadiumId = payload.stadiumId;
  }
  if (payload.homeScore !== undefined) {
    fields.push("home_score = @homeScore");
    params.homeScore = payload.homeScore;
  }
  if (payload.awayScore !== undefined) {
    fields.push("away_score = @awayScore");
    params.awayScore = payload.awayScore;
  }
  if (payload.attendance !== undefined) {
    fields.push("attendance = @attendance");
    params.attendance = payload.attendance;
  }

  if (fields.length === 0) {
    console.log('[updateMatch] DEBUG: No fields to update');
    return getMatchById(matchId);
  }

  fields.push("updated_at = SYSUTCDATETIME()");

  console.log('[updateMatch] DEBUG: Executing UPDATE with fields:', fields);
  console.log('[updateMatch] DEBUG: SQL Params:', params);

  await query(
    `UPDATE matches SET ${fields.join(", ")} WHERE match_id = @matchId;`,
    params
  );

  const updatedMatch = await getMatchById(matchId);

  // Auto-update standings if match is completed and has scores
  if (updatedMatch &&
    payload.status === 'completed' &&
    payload.homeScore !== undefined &&
    payload.awayScore !== undefined) {
    try {
      console.log(`[updateMatch] Auto-calculating standings for season ${updatedMatch.seasonId}`);
      await calculateStandings(updatedMatch.seasonId);
    } catch (error) {
      console.error('[updateMatch] Failed to auto-calculate standings:', error);
      // Don't fail the match update if standings calculation fails
    }
  }

  return updatedMatch;
};

export const deleteMatch = async (matchId: number): Promise<boolean> => {
  const result = await query(
    "DELETE FROM matches WHERE match_id = @matchId;",
    { matchId }
  );

  return (result.rowsAffected?.[0] ?? 0) > 0;
};

export const deleteAllMatches = async (seasonId?: number): Promise<number> => {
  const whereClause = seasonId ? "WHERE season_id = @seasonId" : "";
  const result = await query(
    `DELETE FROM matches ${whereClause};`,
    seasonId ? { seasonId } : {}
  );
  return result.rowsAffected?.[0] ?? 0;
};

export const listLiveMatches = async (): Promise<MatchRecord[]> => {
  const result = await query(
    `
      SELECT
        m.match_id AS matchId,
        m.season_id AS seasonId,
        m.round_id AS roundId,
        m.matchday_number AS matchdayNumber,
        hstp.team_id AS homeTeamId,
        ht.name AS homeTeamName,
        ht.short_name AS homeTeamShortName,
        ht.logo_url AS homeTeamLogo,
        astp.team_id AS awayTeamId,
        at.name AS awayTeamName,
        at.short_name AS awayTeamShortName,
        at.logo_url AS awayTeamLogo,
        m.stadium_id AS stadiumId,
        s.name AS stadiumName,
        CONVERT(VARCHAR(33), m.scheduled_kickoff, 127) AS scheduledKickoff,
        m.status,
        m.home_score AS homeScore,
        m.away_score AS awayScore,
        m.attendance,
        m.match_code AS matchCode,
        CONVERT(VARCHAR(33), m.updated_at, 127) AS updatedAt,
        (SELECT TOP 1 JSON_QUERY((SELECT player_name AS playerName, team_name AS teamName FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)) FROM match_mvps WHERE match_id = m.match_id) AS mvpJson,
        (SELECT (
            SELECT 
                match_event_id AS id,
                stp.team_id AS teamId,
                player_name AS player,
                event_type AS type,
                card_type AS cardType,
                event_minute AS minute,
                description
            FROM match_events me
            INNER JOIN season_team_participants stp ON me.season_team_id = stp.season_team_id
            WHERE me.match_id = m.match_id 
            ORDER BY me.event_minute ASC, me.created_at ASC
            FOR JSON PATH
        )) AS eventsJson,
        (SELECT (
            SELECT 
                stp.team_id AS teamId,
                mts.possession_percent AS possession,
                mts.shots_total AS shots,
                mts.shots_on_target AS onTarget,
                mts.corners,
                mts.fouls_committed AS fouls
            FROM match_team_statistics mts
            INNER JOIN season_team_participants stp ON mts.season_team_id = stp.season_team_id
            WHERE mts.match_id = m.match_id
            FOR JSON PATH
        )) AS statsJson
      FROM matches m
      INNER JOIN season_team_participants hstp ON m.home_season_team_id = hstp.season_team_id
      INNER JOIN teams ht ON hstp.team_id = ht.team_id
      INNER JOIN season_team_participants astp ON m.away_season_team_id = astp.season_team_id
      INNER JOIN teams at ON astp.team_id = at.team_id
      LEFT JOIN stadiums s ON m.stadium_id = s.stadium_id
      WHERE m.status = 'in_progress'
      ORDER BY m.scheduled_kickoff DESC;
    `
  );

  const parseJSON = (str: any) => {
    try {
      return typeof str === 'string' ? JSON.parse(str) : str;
    } catch (e) {
      return null;
    }
  };

  const matches: MatchRecord[] = result.recordset.map((row: any) => {
    const rawEvents = parseJSON(row.eventsJson) || [];
    const rawStats = parseJSON(row.statsJson) || [];
    const rawMvp = parseJSON(row.mvpJson);

    // Map stats array to home/away object
    const homeStats = rawStats.find((s: any) => s.teamId === row.homeTeamId) || null;
    const awayStats = rawStats.find((s: any) => s.teamId === row.awayTeamId) || null;

    return {
      ...row,
      mvp: rawMvp ? { playerName: rawMvp.playerName, teamName: rawMvp.teamName } : null,
      events: rawEvents,
      stats: {
        home: homeStats,
        away: awayStats
      }
    };
  });

  return matches;
};

// Generate random matches from active teams
export const generateRandomMatches = async (options: {
  count?: number;
  seasonId?: number;
  startDate?: string;
} = {}): Promise<{ created: number; matches: MatchRecord[] }> => {
  const seasonId = options.seasonId || await ensureDefaultSeason();
  const count = options.count || 10;

  // Get teams registered in this season
  const teamsResult = await query<{ team_id: number; season_team_id: number; name: string }>(
    `
      SELECT stp.team_id, stp.season_team_id, t.name
      FROM season_team_participants stp
      INNER JOIN teams t ON stp.team_id = t.team_id
      WHERE stp.season_id = @seasonId AND stp.status = 'active'
      ORDER BY NEWID();
    `,
    { seasonId }
  );

  const teams = teamsResult.recordset;

  if (teams.length < 2) {
    throw new Error(`Need at least 2 teams in season. Found: ${teams.length}`);
  }

  const stadiumId = await ensureDefaultStadium();
  const roundId = await ensureRoundForSeason(seasonId);
  const rulesetResult = await query<{ ruleset_id: number }>(
    `SELECT ruleset_id FROM seasons WHERE season_id = @seasonId`,
    { seasonId }
  );
  const rulesetId = rulesetResult.recordset[0].ruleset_id;

  const startDate = options.startDate ? new Date(options.startDate) : new Date();
  const createdMatches: MatchRecord[] = [];

  for (let i = 0; i < Math.min(count, Math.floor(teams.length / 2)); i++) {
    const homeTeam = teams[i * 2];
    const awayTeam = teams[i * 2 + 1];

    if (!homeTeam || !awayTeam) break;

    const kickoff = new Date(startDate.getTime() + i * 2 * 60 * 60 * 1000); // 2 hours apart

    const matchResult = await query<{ match_id: number }>(
      `
        INSERT INTO matches (
          season_id, round_id, matchday_number,
          home_season_team_id, away_season_team_id,
          stadium_id, ruleset_id, scheduled_kickoff, status
        )
        OUTPUT INSERTED.match_id
        VALUES (
          @seasonId, @roundId, @matchdayNumber,
          @homeSeasonTeamId, @awaySeasonTeamId,
          @stadiumId, @rulesetId, @scheduledKickoff, 'scheduled'
        );
      `,
      {
        seasonId,
        roundId,
        matchdayNumber: i + 1,
        homeSeasonTeamId: homeTeam.season_team_id,
        awaySeasonTeamId: awayTeam.season_team_id,
        stadiumId,
        rulesetId,
        scheduledKickoff: kickoff.toISOString()
      }
    );

    const match = await getMatchById(matchResult.recordset[0].match_id);
    if (match) {
      createdMatches.push(match);
    }
  }

  return {
    created: createdMatches.length,
    matches: createdMatches
  };
};

/**
 * @deprecated Football* tables have been removed. This function is now a no-op.
 */
const upsertFootballMatch = async (_match: MatchSummary): Promise<void> => {
  console.warn('[matchService] upsertFootballMatch is deprecated - Football* tables removed');
  return;
};

// Original upsertFootballMatch implementation (DEPRECATED - commented out)
const _upsertFootballMatch_DEPRECATED = async (match: MatchSummary): Promise<void> => {
  // Skip matches without required team data
  if (!match.homeTeam?.id || !match.homeTeam?.name || !match.awayTeam?.id || !match.awayTeam?.name) {
    console.warn(`Skipping match ${match.id}: missing required team data`);
    return;
  }

  // Skip matches without required base data
  if (!match.utcDate || !match.status) {
    console.warn(`Skipping match ${match.id}: missing required match data`);
    return;
  }

  const referee = match.referees?.find((r) => r.type === "REFEREE")?.name ?? null;

  await query(
    `
      MERGE FootballMatches AS target
      USING (
        SELECT 
          @externalId AS external_id,
          @utcDate AS utc_date,
          @status AS status,
          @stage AS stage,
          @groupName AS group_name,
          @matchday AS matchday,
          @season AS season,
          @competitionCode AS competition_code,
          @competitionName AS competition_name,
          @homeTeamId AS home_team_id,
          @homeTeamName AS home_team_name,
          @homeTeamTla AS home_team_tla,
          @awayTeamId AS away_team_id,
          @awayTeamName AS away_team_name,
          @awayTeamTla AS away_team_tla,
          @scoreHome AS score_home,
          @scoreAway AS score_away,
          @scoreHalfHome AS score_half_home,
          @scoreHalfAway AS score_half_away,
          @scoreEtHome AS score_et_home,
          @scoreEtAway AS score_et_away,
          @scorePkHome AS score_pk_home,
          @scorePkAway AS score_pk_away,
          @venue AS venue,
          @referee AS referee,
          @lastUpdated AS last_updated
      ) AS source
      ON target.external_id = source.external_id
      WHEN MATCHED THEN
        UPDATE SET
          utc_date = source.utc_date,
          status = source.status,
          stage = source.stage,
          group_name = source.group_name,
          matchday = source.matchday,
          season = source.season,
          competition_code = source.competition_code,
          competition_name = source.competition_name,
          home_team_id = source.home_team_id,
          home_team_name = source.home_team_name,
          home_team_tla = source.home_team_tla,
          away_team_id = source.away_team_id,
          away_team_name = source.away_team_name,
          away_team_tla = source.away_team_tla,
          score_home = source.score_home,
          score_away = source.score_away,
          score_half_home = source.score_half_home,
          score_half_away = source.score_half_away,
          score_et_home = source.score_et_home,
          score_et_away = source.score_et_away,
          score_pk_home = source.score_pk_home,
          score_pk_away = source.score_pk_away,
          venue = source.venue,
          referee = source.referee,
          last_updated = source.last_updated,
          updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (
          external_id, utc_date, status, stage, group_name, matchday, season,
          competition_code, competition_name,
          home_team_id, home_team_name, home_team_tla,
          away_team_id, away_team_name, away_team_tla,
          score_home, score_away, score_half_home, score_half_away,
          score_et_home, score_et_away, score_pk_home, score_pk_away,
          venue, referee, last_updated
        )
        VALUES (
          source.external_id, source.utc_date, source.status, source.stage, 
          source.group_name, source.matchday, source.season,
          source.competition_code, source.competition_name,
          source.home_team_id, source.home_team_name, source.home_team_tla,
          source.away_team_id, source.away_team_name, source.away_team_tla,
          source.score_home, source.score_away, source.score_half_home, source.score_half_away,
          source.score_et_home, source.score_et_away, source.score_pk_home, source.score_pk_away,
          source.venue, source.referee, source.last_updated
        );
    `,
    {
      externalId: match.id,
      utcDate: match.utcDate,
      status: match.status,
      stage: match.stage,
      groupName: match.group,
      matchday: match.matchday,
      season: match.season?.toString() ?? null,
      competitionCode: match.competition?.code ?? null,
      competitionName: match.competition?.name ?? null,
      homeTeamId: match.homeTeam.id,
      homeTeamName: match.homeTeam.name,
      homeTeamTla: match.homeTeam.tla,
      awayTeamId: match.awayTeam.id,
      awayTeamName: match.awayTeam.name,
      awayTeamTla: match.awayTeam.tla,
      scoreHome: match.score.fullTime?.home ?? null,
      scoreAway: match.score.fullTime?.away ?? null,
      scoreHalfHome: match.score.halfTime?.home ?? null,
      scoreHalfAway: match.score.halfTime?.away ?? null,
      scoreEtHome: match.score.extraTime?.home ?? null,
      scoreEtAway: match.score.extraTime?.away ?? null,
      scorePkHome: match.score.penalties?.home ?? null,
      scorePkAway: match.score.penalties?.away ?? null,
      venue: match.venue,
      referee,
      lastUpdated: match.lastUpdated,
    }
  );
};

/**
 * @deprecated Football* tables have been removed. Returns empty data.
 * Use listMatches() for internal matches instead.
 */
export const listFootballMatches = async (filters: {
  status?: string;
  season?: string;
  dateFrom?: string;
  dateTo?: string;
  teamId?: number;
  search?: string;
  page?: number;
  limit?: number;
  showUnknown?: boolean;
} = {}): Promise<{
  data: Array<{
    id: number;
    externalId: number;
    utcDate: string;
    status: string;
    stage: string | null;
    groupName: string | null;
    matchday: number | null;
    season: string | null;
    competitionCode: string | null;
    competitionName: string | null;
    homeTeamId: number;
    homeTeamName: string;
    homeTeamTla: string | null;
    awayTeamId: number;
    awayTeamName: string;
    awayTeamTla: string | null;
    scoreHome: number | null;
    scoreAway: number | null;
    scoreHalfHome: number | null;
    scoreHalfAway: number | null;
    venue: string | null;
    referee: string | null;
    lastUpdated: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  console.warn('[matchService] listFootballMatches is deprecated - Football* tables removed. Use listMatches() instead.');
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit ? Math.min(Math.max(filters.limit, 1), 100) : 20;

  return {
    data: [],
    total: 0,
    page,
    limit,
    totalPages: 0
  };
};

/**
 * @deprecated Football* tables have been removed. External API sync is disabled.
 */
export const syncMatchesFromUpstream = async (options: {
  season?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}): Promise<{
  season?: string;
  totalMatches: number;
  syncedMatches: number;
  skippedMatches: number;
}> => {
  console.warn('[matchService] syncMatchesFromUpstream is deprecated - Football* tables removed');

  return {
    season: options.season,
    totalMatches: 0,
    syncedMatches: 0,
    skippedMatches: 0,
  };
};

export const createBulkMatches = async (matches: DraftMatch[]): Promise<number> => {
  if (!matches.length) return 0;

  console.log(`[BulkCreate] Starting bulk create for ${matches.length} matches`);
  const uniqueSeasonIds = [...new Set(matches.map(m => m.seasonId))];
  const defaultStadiumId = await ensureDefaultStadium();

  // 1. Prepare Caches
  const teamSeasonMap = new Map<string, number>(); // "seasonId:teamId" -> seasonTeamId
  const roundMap = new Map<string, number>(); // "seasonId:roundNum" -> roundId
  const rulesetMap = new Map<number, number>(); // seasonId -> rulesetId
  const existingMatchSet = new Set<string>();

  for (const sId of uniqueSeasonIds) {
    // A. Ruleset
    try {
      const rs = await query<{ ruleset_id: number }>(`SELECT ruleset_id FROM seasons WHERE season_id = @sId`, { sId });
      rulesetMap.set(sId, rs.recordset[0]?.ruleset_id ?? 1);
    } catch { rulesetMap.set(sId, 1); }

    // B. Teams
    const teamsInThisSeason = new Set([
      ...matches.filter(m => m.seasonId === sId).map(m => m.homeTeamId),
      ...matches.filter(m => m.seasonId === sId).map(m => m.awayTeamId),
    ]);

    // Fetch existing teams
    const existingTeams = await query(
      `SELECT team_id, season_team_id FROM season_team_participants WHERE season_id = @sId`,
      { sId }
    );
    existingTeams.recordset.forEach((r: any) => {
      teamSeasonMap.set(`${sId}:${r.team_id}`, r.season_team_id);
    });

    // Insert missing teams
    const missingTeams = [...teamsInThisSeason].filter(tid => !teamSeasonMap.has(`${sId}:${tid}`));
    for (const tid of missingTeams) {
      const stId = await ensureTeamInSeason(tid, sId);
      teamSeasonMap.set(`${sId}:${tid}`, stId);
    }

    // C. Rounds
    const roundsInThisSeason = new Set(matches.filter(m => m.seasonId === sId).map(m => m.roundNumber || m.matchday || 1));
    // Fetch existing rounds
    const existingRounds = await query(
      `SELECT round_number, round_id FROM season_rounds WHERE season_id = @sId`,
      { sId }
    );
    existingRounds.recordset.forEach((r: any) => {
      roundMap.set(`${sId}:${r.round_number}`, r.round_id);
    });

    // Insert missing rounds
    const missingRounds = [...roundsInThisSeason].filter(rn => !roundMap.has(`${sId}:${rn}`));
    for (const rn of missingRounds) {
      const rId = await ensureRoundForSeason(sId, rn);
      roundMap.set(`${sId}:${rn}`, rId);
    }

    // D. Fetch existing matches to prevent duplicates
    const existingMatchesResult = await query<{ season_id: number, round_id: number, home_season_team_id: number, away_season_team_id: number }>(
      `SELECT season_id, round_id, home_season_team_id, away_season_team_id FROM matches WHERE season_id = @sId`,
      { sId }
    );
    existingMatchesResult.recordset.forEach(r => {
      existingMatchSet.add(`${r.season_id}:${r.round_id}:${r.home_season_team_id}:${r.away_season_team_id}`);
    });
  }

  // 2. Batch Insert
  let totalInserted = 0;
  const chunkSize = 50;

  for (let i = 0; i < matches.length; i += chunkSize) {
    const chunk = matches.slice(i, i + chunkSize);
    const valuesPart: string[] = [];
    const params: any = { defaultStadiumId };

    chunk.forEach((m, idx) => {
      const sId = m.seasonId;
      const rNum = m.roundNumber || m.matchday || 1;
      const roundId = roundMap.get(`${sId}:${rNum}`);
      const homeSeasonTeamId = teamSeasonMap.get(`${sId}:${m.homeTeamId}`);
      const awaySeasonTeamId = teamSeasonMap.get(`${sId}:${m.awayTeamId}`);
      const rulesetId = rulesetMap.get(sId) ?? 1;

      if (!roundId || !homeSeasonTeamId || !awaySeasonTeamId) {
        console.warn(`[BulkCreate] Skipping invalid match data: Season ${sId}, Round ${rNum}, Home ${m.homeTeamId}, Away ${m.awayTeamId}`);
        return;
      }

      // Check for duplicates
      const compositeKey = `${sId}:${roundId}:${homeSeasonTeamId}:${awaySeasonTeamId}`;
      if (existingMatchSet.has(compositeKey)) {
        // console.log(`[BulkCreate] Skipping duplicate match: ${compositeKey}`);
        return;
      }

      // Generate unique match code
      const matchCode = `M${sId}-${roundId}-${homeSeasonTeamId}-${awaySeasonTeamId}-${Math.floor(Math.random() * 10000000)}`;

      params[`s${idx}`] = sId;
      params[`r${idx}`] = roundId;
      params[`md${idx}`] = m.matchday || 1;
      params[`ht${idx}`] = homeSeasonTeamId;
      params[`at${idx}`] = awaySeasonTeamId;
      // params[`stad${idx}`] = m.venue ? defaultStadiumId : defaultStadiumId; // removed unused venue
      params[`rs${idx}`] = rulesetId;
      params[`k${idx}`] = m.utcDate;
      params[`mc${idx}`] = matchCode;

      valuesPart.push(`(@s${idx}, @r${idx}, @md${idx}, @ht${idx}, @at${idx}, @defaultStadiumId, @rs${idx}, @k${idx}, 'scheduled', @mc${idx})`);

      // Add to set to prevent duplicates within the same bulk batch
      existingMatchSet.add(compositeKey);
    });

    if (valuesPart.length === 0) continue;

    const sql = `
      INSERT INTO matches (
        season_id, round_id, matchday_number,
        home_season_team_id, away_season_team_id,
        stadium_id, ruleset_id, scheduled_kickoff, status,
        match_code
      )
      VALUES ${valuesPart.join(', ')};
    `;

    try {
      await query(sql, params);
      totalInserted += chunk.length;
      console.log(`[BulkCreate] Inserted chunk ${(i / chunkSize) + 1}: ${chunk.length} matches`);
    } catch (e) {
      console.error(`[BulkCreate] Batch insert failed for chunk ${i}:`, e);
    }
  }

  return totalInserted;
};

export const generateRoundRobinSchedule = async (params: {
  teamIds: number[];
  seasonId?: number;
  startDate?: string;
}): Promise<DraftMatch[]> => {
  const { teamIds, seasonId, startDate } = params;
  if (!teamIds || teamIds.length < 2) {
    throw new Error('At least 2 teams are required');
  }

  // If seasonId is provided, verify it exists
  let sId = seasonId;
  let rulesetId = 1;

  if (sId) {
    const seasonRes = await query<{ season_id: number, ruleset_id: number }>(
      "SELECT season_id, ruleset_id FROM seasons WHERE season_id = @id",
      { id: sId }
    );
    if (seasonRes.recordset.length) {
      rulesetId = seasonRes.recordset[0].ruleset_id;
    } else {
      // Fallback or error? Let's default to recently active if invalid, or just keep sId
      console.warn(`Season ID ${sId} not found, proceeding potentially with default FK issues if strictly enforced`);
    }
  } else {
    // Try to get current season
    // Try to get current season from status
    const currentSeason = await query<{ season_id: number }>("SELECT TOP 1 season_id FROM seasons WHERE status = 'in_progress' ORDER BY start_date DESC");
    sId = currentSeason.recordset[0]?.season_id;
  }

  // Helper to rotate array for round robin
  const rotate = (arr: number[]) => {
    const last = arr.pop();
    if (last) arr.splice(1, 0, last);
    return arr;
  };

  // Helper to shuffle array (Fisher-Yates)
  const shuffle = (array: number[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  // 1. Randomize teams
  const shuffledTeamIds = shuffle([...teamIds]);
  const teams = [...shuffledTeamIds];

  if (teams.length % 2 !== 0) {
    teams.push(0); // Dummy team
  }

  const numTeams = teams.length;
  const numRounds = (numTeams - 1) * 2; // Double round robin
  const matchesPerRound = numTeams / 2;

  console.log(`[ScheduleGen] Generating schedule for ${numTeams} teams (including dummy if odd)`);
  console.log(`[ScheduleGen] Total Rounds: ${numRounds}`);
  console.log(`[ScheduleGen] Matches per Round (max): ${matchesPerRound}`);

  const schedule: any[] = [];

  // Find next valid Tuesday start date
  let currentRoundDate = startDate ? new Date(startDate) : new Date();

  // Advance to next Tuesday if not already
  while (currentRoundDate.getDay() !== 2) {
    currentRoundDate.setDate(currentRoundDate.getDate() + 1);
  }

  // Single Round Robin first
  let roundTeams = [...teams];

  for (let round = 1; round <= numRounds; round++) {
    const isSecondHalf = round > (numRounds / 2);

    // Determine matches for this round
    const roundMatchesData = [];

    for (let i = 0; i < matchesPerRound; i++) {
      const t1 = roundTeams[i];
      const t2 = roundTeams[numTeams - 1 - i];

      if (t1 === 0 || t2 === 0) continue;

      // Swap home/away for second half
      const home = isSecondHalf ? t2 : t1;
      const away = isSecondHalf ? t1 : t2;

      roundMatchesData.push({ home, away });
    }

    // Shuffle matches within the round to randomize who plays on which day
    // (Optional, but good for variety)
    // const shuffledRoundMatches = roundMatchesData; // or shuffle(roundMatchesData) if object shuffling needed

    // Distribute matches across Tue (2), Wed (3), Thu (4)
    // If round has e.g. 4 matches: 2 on Tue, 1 on Wed, 1 on Thu? Or just sequential.
    // Let's do sequential distribution: Tue, Wed, Thu, Tue, Wed, Thu...

    // Reset day offset for the start of the week
    let dayOffset = 0;

    for (let mIndex = 0; mIndex < roundMatchesData.length; mIndex++) {
      const matchPair = roundMatchesData[mIndex];

      // 0 -> Tue (offset 0), 1 -> Wed (offset 1), 2 -> Thu (offset 2), 3 -> Tue (offset 0)...
      const dayMode = mIndex % 3;

      const matchDate = new Date(currentRoundDate);
      matchDate.setDate(matchDate.getDate() + dayMode);

      // Set Random Time: 01:00 to 04:00
      // Random hour: 1, 2, 3, or 4? (User said "rạng sáng" usually 1-4)
      // Let's say 01:00 to 04:59? Or fixed slots?
      // User requested "khung giờ rạng sáng". 02:00, 03:00 is safe Champions League style (local time usually late, but rạng sáng VN is correct).
      const randomHour = Math.floor(Math.random() * (4 - 1 + 1)) + 1; // 1 to 4
      matchDate.setHours(randomHour, 0, 0, 0);

      schedule.push({
        homeTeamId: matchPair.home,
        awayTeamId: matchPair.away,
        matchday: round,
        roundNumber: round,
        seasonId: sId,
        utcDate: matchDate.toISOString(),
        status: 'scheduled',
        venue: 'TBC',
        homeTeamName: `Team ${matchPair.home}`,
        awayTeamName: `Team ${matchPair.away}`
      });
    }

    // Prepare date for next round (Next Week)
    // Current round started on a Tuesday. Next round should start on next Tuesday (+7 days)
    currentRoundDate.setDate(currentRoundDate.getDate() + 7);

    // Rotate for next round (Berger rotation)
    // Keep first team fixed, rotate the rest
    // Standard Berger table rotation
    // Note: The teams array includes the dummy if odd.
    // If numTeams is even (including dummy), index 0 is fixed.

    // teams array is [0, 1, 2, 3...]
    // fixed is roundTeams[0]
    // moving is roundTeams[1...end]
    const fixed = roundTeams[0];
    const moving = roundTeams.slice(1);

    // Rotate moving: last becomes first
    const last = moving.pop();
    if (last !== undefined) moving.unshift(last);

    roundTeams = [fixed, ...moving];
  }

  return schedule;
};

