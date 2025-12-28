import { query } from "../db/sqlServer";

interface SqlError extends Error {
  number?: number;
}

function isMissingSeasonTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  return (error as SqlError).number === 208;
}

export const SEASON_STATUSES = [
  "draft",
  "inviting",
  "registering",
  "scheduled",
  "in_progress",
  "completed",
  "archived",
] as const;

export type SeasonStatus = (typeof SEASON_STATUSES)[number];

interface SeasonRow {
  season_id: number;
  tournament_id: number;
  tournament_name: string;
  ruleset_id: number;
  ruleset_name: string;
  name: string;
  code: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  participation_fee: number | string | null;
  max_teams: number;
  expected_rounds: number;
  status: SeasonStatus;
  invitation_opened_at: string | null;
  registration_deadline: string | null;
  created_at: string;
  updated_at: string | null;
}

const baseSeasonSelect = `
  SELECT
    s.season_id,
    s.tournament_id,
    t.name AS tournament_name,
    s.ruleset_id,
    r.name AS ruleset_name,
    s.name,
    s.code,
    s.description,
    CONVERT(VARCHAR(10), s.start_date, 23) AS start_date,
    CONVERT(VARCHAR(10), s.end_date, 23) AS end_date,
    s.participation_fee,
    s.max_teams,
    s.expected_rounds,
    s.status,
    CONVERT(VARCHAR(23), s.invitation_opened_at, 126) AS invitation_opened_at,
    CONVERT(VARCHAR(23), s.registration_deadline, 126) AS registration_deadline,
    CONVERT(VARCHAR(23), s.created_at, 126) AS created_at,
    CONVERT(VARCHAR(23), s.updated_at, 126) AS updated_at
  FROM seasons s
  INNER JOIN tournaments t ON s.tournament_id = t.tournament_id
  INNER JOIN rulesets r ON s.ruleset_id = r.ruleset_id
`;

type SeasonLabelSource = {
  season_id: number;
  name?: string | null;
  code?: string | null;
  start_date?: string | null;
};

const normalizeSeasonLabel = (row: SeasonLabelSource): string => {
  if (row.name && row.name.trim()) {
    return row.name.trim();
  }
  if (row.code && row.code.trim()) {
    return row.code.trim();
  }
  if (row.start_date) {
    const startYear = new Date(row.start_date).getFullYear();
    return `${startYear}-${startYear + 1}`;
  }
  return String(row.season_id);
};

export interface SeasonSummary {
  id: number;
  name: string;
  code: string;
  status: SeasonStatus;
  startDate: string;
  endDate: string | null;
  tournamentId: number;
  tournamentName: string;
  rulesetId: number;
  rulesetName: string;
  description: string | null;
  participationFee: number;
  maxTeams: number;
  expectedRounds: number;
  invitationOpenedAt: string | null;
  registrationDeadline: string | null;
  createdAt: string;
  updatedAt: string | null;
  label: string;
}

const mapSeasonRow = (row: SeasonRow): SeasonSummary => ({
  id: row.season_id,
  name: row.name,
  code: row.code,
  status: row.status,
  startDate: row.start_date,
  endDate: row.end_date,
  tournamentId: row.tournament_id,
  tournamentName: row.tournament_name || 'Unknown Tournament',
  rulesetId: row.ruleset_id,
  rulesetName: row.ruleset_name || 'Unknown Ruleset',
  description: row.description,
  participationFee: row.participation_fee !== null ? Number(row.participation_fee) : 0,
  maxTeams: row.max_teams,
  expectedRounds: row.expected_rounds,
  invitationOpenedAt: row.invitation_opened_at,
  registrationDeadline: row.registration_deadline,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  label: normalizeSeasonLabel(row),
});

export interface SeasonMetadata {
  statuses: readonly SeasonStatus[];
  tournaments: Array<{ id: number; name: string }>;
  rulesets: Array<{ id: number; name: string }>;
}

export interface CreateSeasonInput {
  tournamentId: number;
  rulesetId: number;
  name: string;
  code: string;
  status: SeasonStatus;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
  participationFee?: number;
  invitationOpenedAt?: string | null;
  registrationDeadline?: string | null;
  maxTeams?: number;
  expectedRounds?: number;
  actorId: number;
}

export interface UpdateSeasonInput {
  tournamentId: number;
  rulesetId: number;
  name: string;
  code: string;
  status: SeasonStatus;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
  participationFee?: number;
  invitationOpenedAt?: string | null;
  registrationDeadline?: string | null;
  maxTeams?: number;
  expectedRounds?: number;
  actorId: number;
}

const sanitizeOptionalDate = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

const sanitizeDateOnly = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  return date.toISOString().slice(0, 10);
};

export async function listSeasons(): Promise<SeasonSummary[]> {
  try {
    const result = await query<SeasonRow>(
      `${baseSeasonSelect}
       ORDER BY s.start_date DESC, s.season_id DESC`
    );
    return result.recordset.map(mapSeasonRow);
  } catch (error) {
    if (isMissingSeasonTableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getSeasonById(seasonId: number): Promise<SeasonSummary | null> {
  try {
    const result = await query<SeasonRow>(
      `${baseSeasonSelect}
       WHERE s.season_id = @seasonId`,
      { seasonId }
    );
    const row = result.recordset[0];
    if (!row) {
      return null;
    }
    return mapSeasonRow(row);
  } catch (error) {
    if (isMissingSeasonTableError(error)) {
      return null;
    }
    throw error;
  }
}

export async function createSeason(input: CreateSeasonInput): Promise<SeasonSummary> {
  const participationFee = Number.isFinite(input.participationFee) ? Number(input.participationFee) : 0;
  const maxTeams = input.maxTeams ?? 10;
  const expectedRounds = input.expectedRounds ?? 18;

  const inserted = await query<{ season_id: number }>(
    `
      INSERT INTO seasons (
        tournament_id,
        ruleset_id,
        name,
        code,
        description,
        start_date,
        end_date,
        participation_fee,
        max_teams,
        expected_rounds,
        status,
        invitation_opened_at,
        registration_deadline,
        created_by
      )
      OUTPUT INSERTED.season_id
      VALUES (
        @tournamentId,
        @rulesetId,
        @name,
        @code,
        @description,
        @startDate,
        @endDate,
        @participationFee,
        @maxTeams,
        @expectedRounds,
        @status,
        @invitationOpenedAt,
        @registrationDeadline,
        @actorId
      )
    `,
    {
      tournamentId: input.tournamentId,
      rulesetId: input.rulesetId,
      name: input.name.trim(),
      code: input.code.trim(),
      description: input.description?.trim() ?? null,
      startDate: sanitizeDateOnly(input.startDate),
      endDate: input.endDate ? sanitizeDateOnly(input.endDate) : null,
      participationFee,
      maxTeams,
      expectedRounds,
      status: input.status,
      invitationOpenedAt: sanitizeOptionalDate(input.invitationOpenedAt),
      registrationDeadline: sanitizeOptionalDate(input.registrationDeadline),
      actorId: input.actorId,
    }
  );

  const seasonId = inserted.recordset[0]?.season_id;
  if (!seasonId) {
    throw new Error("Failed to create season");
  }

  await query(
    `
      INSERT INTO season_status_history (season_id, from_status, to_status, changed_by)
      VALUES (@seasonId, NULL, @status, @actorId)
    `,
    {
      seasonId,
      status: input.status,
      actorId: input.actorId,
    }
  ).catch(() => undefined);

  const created = await getSeasonById(seasonId);
  if (!created) {
    throw new Error("Unable to load created season");
  }
  return created;
}

export async function updateSeason(seasonId: number, input: UpdateSeasonInput): Promise<SeasonSummary> {
  const existing = await getSeasonById(seasonId);
  if (!existing) {
    throw new Error("Season not found");
  }

  const participationFee = Number.isFinite(input.participationFee) ? Number(input.participationFee) : 0;
  const maxTeams = input.maxTeams ?? existing.maxTeams;
  const expectedRounds = input.expectedRounds ?? existing.expectedRounds;

  const updated = await query<{ season_id: number }>(
    `
      UPDATE seasons
      SET
        tournament_id = @tournamentId,
        ruleset_id = @rulesetId,
        name = @name,
        code = @code,
        description = @description,
        start_date = @startDate,
        end_date = @endDate,
        participation_fee = @participationFee,
        max_teams = @maxTeams,
        expected_rounds = @expectedRounds,
        status = @status,
        invitation_opened_at = @invitationOpenedAt,
        registration_deadline = @registrationDeadline,
        updated_by = @actorId,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.season_id
      WHERE season_id = @seasonId
    `,
    {
      seasonId,
      tournamentId: input.tournamentId,
      rulesetId: input.rulesetId,
      name: input.name.trim(),
      code: input.code.trim(),
      description: input.description?.trim() ?? null,
      startDate: sanitizeDateOnly(input.startDate),
      endDate: input.endDate ? sanitizeDateOnly(input.endDate) : null,
      participationFee,
      maxTeams,
      expectedRounds,
      status: input.status,
      invitationOpenedAt: sanitizeOptionalDate(input.invitationOpenedAt),
      registrationDeadline: sanitizeOptionalDate(input.registrationDeadline),
      actorId: input.actorId,
    }
  );

  if (updated.recordset.length === 0) {
    throw new Error("Season not found");
  }

  if (existing.status !== input.status) {
    await query(
      `
        INSERT INTO season_status_history (season_id, from_status, to_status, changed_by)
        VALUES (@seasonId, @fromStatus, @toStatus, @actorId)
      `,
      {
        seasonId,
        fromStatus: existing.status,
        toStatus: input.status,
        actorId: input.actorId,
      }
    ).catch(() => undefined);
  }

  const refreshed = await getSeasonById(seasonId);
  if (!refreshed) {
    throw new Error("Unable to load updated season");
  }
  return refreshed;
}

export async function deleteSeason(seasonId: number): Promise<boolean> {
  // 1. Delete dependent match data
  await query(`
    DELETE FROM match_lineup_players WHERE lineup_id IN (SELECT lineup_id FROM match_lineups WHERE match_id IN (SELECT match_id FROM matches WHERE season_id = @seasonId));
    DELETE FROM match_lineups WHERE match_id IN (SELECT match_id FROM matches WHERE season_id = @seasonId);
    DELETE FROM match_reports WHERE match_id IN (SELECT match_id FROM matches WHERE season_id = @seasonId);
    DELETE FROM match_official_assignments WHERE match_id IN (SELECT match_id FROM matches WHERE season_id = @seasonId);
    DELETE FROM player_match_stats WHERE match_id IN (SELECT match_id FROM matches WHERE season_id = @seasonId);
    DELETE FROM match_events WHERE match_id IN (SELECT match_id FROM matches WHERE season_id = @seasonId);
    DELETE FROM match_mvps WHERE match_id IN (SELECT match_id FROM matches WHERE season_id = @seasonId);
    DELETE FROM match_team_statistics WHERE match_id IN (SELECT match_id FROM matches WHERE season_id = @seasonId);
    DELETE FROM match_audit_logs WHERE match_id IN (SELECT match_id FROM matches WHERE season_id = @seasonId);
  `, { seasonId });

  // 1.1 Delete season-specific registrations and details
  await query(`
      DELETE FROM season_player_registrations WHERE season_id = @seasonId;
      DELETE FROM season_team_registrations WHERE season_id = @seasonId;
      DELETE FROM season_invitations WHERE season_id = @seasonId;
      DELETE FROM team_kits WHERE season_id = @seasonId;
  `, { seasonId });

  // 2. Delete matches
  await query(`DELETE FROM matches WHERE season_id = @seasonId`, { seasonId });

  // 3. Delete season-specific team data
  await query(`DELETE FROM season_team_statistics WHERE season_id = @seasonId`, { seasonId });

  // 4. Delete rounds
  await query(`DELETE FROM season_rounds WHERE season_id = @seasonId`, { seasonId });

  // 5. Delete participants (and implicitly their roles in this season if any, usually purely relational)
  await query(`DELETE FROM season_team_participants WHERE season_id = @seasonId`, { seasonId });

  // 6. Delete season history
  await query(`DELETE FROM season_status_history WHERE season_id = @seasonId`, { seasonId });

  // 7. Delete season
  const result = await query(
    `DELETE FROM seasons WHERE season_id = @seasonId`,
    { seasonId }
  );

  const affected = result.rowsAffected?.[0] ?? 0;
  return affected > 0;
}

export async function listSeasonMetadata(): Promise<SeasonMetadata> {
  try {
    const [tournamentsResult, rulesetsResult] = await Promise.all([
      query<{ tournament_id: number; name: string }>(
        `SELECT DISTINCT tournament_id, name FROM tournaments ORDER BY name`
      ),
      query<{ ruleset_id: number; name: string }>(
        `SELECT DISTINCT ruleset_id, name FROM rulesets ORDER BY name`
      ),
    ]);

    // Remove duplicates by ID (in case DISTINCT doesn't catch all cases)
    const tournamentsMap = new Map<number, { id: number; name: string }>();
    tournamentsResult.recordset.forEach((row) => {
      if (!tournamentsMap.has(row.tournament_id)) {
        tournamentsMap.set(row.tournament_id, {
          id: row.tournament_id,
          name: row.name,
        });
      }
    });

    const rulesetsMap = new Map<number, { id: number; name: string }>();
    rulesetsResult.recordset.forEach((row) => {
      if (!rulesetsMap.has(row.ruleset_id)) {
        rulesetsMap.set(row.ruleset_id, {
          id: row.ruleset_id,
          name: row.name,
        });
      }
    });

    return {
      statuses: SEASON_STATUSES,
      tournaments: Array.from(tournamentsMap.values()),
      rulesets: Array.from(rulesetsMap.values()),
    };
  } catch (error) {
    if (isMissingSeasonTableError(error)) {
      return { statuses: SEASON_STATUSES, tournaments: [], rulesets: [] };
    }
    throw error;
  }
}

// Get seasons for public display (format compatible with frontend)
export async function getInternalSeasons(): Promise<Array<{
  id: number;
  year: number;
  startDate: string;
  endDate: string;
  label: string;
}>> {
  try {
    const result = await query<SeasonRow>(
      `${baseSeasonSelect}
       WHERE s.status <> 'archived'
       ORDER BY s.start_date DESC, s.season_id DESC`
    );

    return result.recordset.map((row) => {
      const startYear = row.start_date ? new Date(row.start_date).getFullYear() : new Date().getFullYear();
      return {
        id: row.season_id,
        year: startYear,
        startDate: row.start_date || "",
        endDate: row.end_date || "",
        label: normalizeSeasonLabel(row),
      };
    });
  } catch (error) {
    if (isMissingSeasonTableError(error)) {
      return [];
    }
    return [];
  }
}

// Get standings from season_team_statistics
export async function getInternalStandings(filters: { seasonId?: number; season?: string } = {}): Promise<{
  season: {
    year: number;
    label: string;
    startDate: string;
    endDate: string;
  };
  updated: string;
  table: Array<{
    position: number;
    teamId: number;
    teamName: string;
    shortName: string | null;
    tla: string | null;
    crest: string | null;
    played: number;
    won: number;
    draw: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    form: string[];
    status: string;
  }>;
}> {
  try {
    // Get season info
    let seasonId = filters.seasonId;

    // If season year provided (like "2024"), find the corresponding seasonId
    if (!seasonId && filters.season) {
      try {
        const seasonByYear = await query<{ season_id: number }>(
          `SELECT TOP 1 season_id 
           FROM seasons 
           WHERE (
             name LIKE @seasonPattern OR 
             code LIKE @seasonPattern OR
             YEAR(start_date) = @seasonYear
           )
           AND status IN ('in_progress', 'completed')
           ORDER BY start_date DESC`,
          {
            seasonPattern: `%${filters.season}%`,
            seasonYear: isNaN(Number(filters.season)) ? 0 : Number(filters.season)
          }
        );

        if (seasonByYear.recordset && seasonByYear.recordset.length > 0) {
          seasonId = seasonByYear.recordset[0].season_id;
        }
      } catch (err) {
        console.log('[getInternalStandings] Season lookup by year failed:', err);
      }
    }

    if (!seasonId) {
      // Get latest season
      try {
        const latestSeason = await query<{ season_id: number }>(
          `SELECT TOP 1 season_id 
           FROM seasons 
           WHERE status IN ('in_progress', 'completed')
           ORDER BY start_date DESC, season_id DESC`
        );

        if (!latestSeason.recordset || latestSeason.recordset.length === 0) {
          console.log('[getInternalStandings] No active season found, returning empty standings');
          return {
            season: {
              year: new Date().getFullYear(),
              label: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
              startDate: '',
              endDate: ''
            },
            updated: new Date().toISOString(),
            table: []
          };
        }

        seasonId = latestSeason.recordset[0].season_id;
      } catch (err) {
        console.log('[getInternalStandings] Latest season query failed:', err);
        return {
          season: {
            year: new Date().getFullYear(),
            label: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
            startDate: '',
            endDate: ''
          },
          updated: new Date().toISOString(),
          table: []
        };
      }
    }

    // Get season details
    let season: any;
    let startYear: number;

    try {
      const seasonInfo = await query<{
        season_id: number;
        name: string;
        code: string | null;
        status: SeasonStatus;
        start_date: string | null;
        end_date: string | null;
      }>(
        `SELECT season_id, name, code, status, start_date, end_date
         FROM seasons
         WHERE season_id = @seasonId`,
        { seasonId }
      );

      if (!seasonInfo.recordset || seasonInfo.recordset.length === 0) {
        console.log('[getInternalStandings] Season not found, returning empty standings');
        return {
          season: {
            year: new Date().getFullYear(),
            label: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
            startDate: '',
            endDate: ''
          },
          updated: new Date().toISOString(),
          table: []
        };
      }

      season = seasonInfo.recordset[0];
      startYear = season.start_date ? new Date(season.start_date).getFullYear() : new Date().getFullYear();
    } catch (err) {
      console.log('[getInternalStandings] Season info query failed:', err);
      return {
        season: {
          year: new Date().getFullYear(),
          label: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
          startDate: '',
          endDate: ''
        },
        updated: new Date().toISOString(),
        table: []
      };
    }

    // Get standings - handle if table doesn't exist or is empty
    let standings: any;
    try {
      standings = await query(
        `SELECT 
          ROW_NUMBER() OVER (ORDER BY sts.points DESC, sts.goal_difference DESC, sts.goals_for DESC) AS position,
          t.team_id AS teamId,
          t.name AS teamName,
          t.short_name AS shortName,
          t.code AS tla,
          NULL AS crest,
          sts.matches_played AS played,
          sts.wins AS won,
          sts.draws AS draw,
          sts.losses AS lost,
          sts.goals_for AS goalsFor,
          sts.goals_against AS goalsAgainst,
          sts.goal_difference AS goalDifference,
          sts.points,
          stp.status
         FROM season_team_statistics sts
         INNER JOIN season_team_participants stp ON sts.season_team_id = stp.season_team_id
         INNER JOIN teams t ON stp.team_id = t.team_id
         WHERE sts.season_id = @seasonId
         ORDER BY sts.points DESC, sts.goal_difference DESC, sts.goals_for DESC`,
        { seasonId }
      );
    } catch (err) {
      console.log('[getInternalStandings] Standings query failed:', err);
      // Return empty standings if query fails
      return {
        season: {
          year: startYear,
          label: normalizeSeasonLabel(season),
          startDate: season.start_date || '',
          endDate: season.end_date || ''
        },
        updated: new Date().toISOString(),
        table: []
      };
    }

    // Calculate status based on position
    const table = (standings.recordset || []).map((row: any, index: number) => {
      let status = 'qualified';
      if (row.position > 24) {
        status = 'eliminated';
      } else if (row.position > 8) {
        status = 'playoff';
      }

      return {
        ...row,
        form: [], // TODO: Calculate form from recent matches
        status
      };
    });

    return {
      season: {
        year: startYear,
        label: normalizeSeasonLabel(season),
        startDate: season.start_date || '',
        endDate: season.end_date || ''
      },
      updated: new Date().toISOString(),
      table
    };
  } catch (error) {
    if (isMissingSeasonTableError(error)) {
      return {
        season: {
          year: new Date().getFullYear(),
          label: '',
          startDate: '',
          endDate: ''
        },
        updated: new Date().toISOString(),
        table: []
      };
    }
    throw error;
  }
}

export async function listSeasonTeamsByIdentifier(identifier: string | number) {
  // 1. Resolve season_id
  const seasonRes = await query(
    `
    SELECT TOP 1 season_id
    FROM seasons
    WHERE season_id = TRY_CAST(@id AS INT)
       OR code = @id
       OR name = @id
    `,
    { id: String(identifier) }
  );

  const seasonId = seasonRes.recordset[0]?.season_id;
  if (!seasonId) return [];

  // 2. Get teams in season
  const teamsRes = await query(
    `
    SELECT
      stp.season_team_id,
      stp.season_id,
      t.team_id,
      t.name AS team_name
    FROM season_team_participants stp
    JOIN teams t ON t.team_id = stp.team_id
    WHERE stp.season_id = @seasonId
      AND stp.status = 'active'
    ORDER BY t.name
    `,
    { seasonId }
  );

  return teamsRes.recordset;
}
