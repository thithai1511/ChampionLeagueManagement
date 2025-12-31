import { query, transaction } from "../db/sqlServer";
import { NotFoundError, BadRequestError } from "../utils/httpError";
import { logEvent } from "./auditService";
import { listGoalTypes } from "./goalTypeService";

interface RulesetInput {
  name: string;
  versionTag: string;
  description?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  actorId: number;
  actorUsername: string;
}

interface ConstraintsInput {
  minAge: number;
  maxAge: number;
  maxPlayers: number;
  maxForeignPlayers: number;
  squadDeadline?: string;
}

interface ScoringInput {
  maxGoalTime: number;
  acceptedGoalTypes: string[];
}

interface RankingInput {
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
  tieBreakingOrder: string[];
}

interface PlayerConstraints {
  minAge: number;
  maxAge: number;
  maxPlayers: number;
  maxForeignPlayers: number;
  squadDeadline?: string | null;
}

interface ScoringRules {
  maxGoalTime: number;
  acceptedGoalTypes: string[];
}

interface RankingRules {
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
  tieBreakingOrder: string[];
}

interface SeasonAssignment {
  seasonId: number;
  assignedAt: string;
  seasonName?: string | null;
  seasonCode?: string | null;
}

interface SqlObjectError extends Error {
  number?: number;
}

function isMissingObjectError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  const err = error as SqlObjectError;
  return err.number === 208;
}

async function fetchSeasonAssignments(rulesetId: number) {
  try {
    return await query(
      `SELECT sra.season_id,
              sra.assigned_at,
              s.name AS season_name,
              s.code AS season_code
       FROM season_ruleset_assignments AS sra
       LEFT JOIN seasons AS s ON s.season_id = sra.season_id
       WHERE sra.ruleset_id = @rulesetId
       ORDER BY sra.assigned_at DESC`,
      { rulesetId }
    );
  } catch (error) {
    if (isMissingObjectError(error)) {
      return query(
        `SELECT season_id,
                assigned_at
         FROM season_ruleset_assignments
         WHERE ruleset_id = @rulesetId
         ORDER BY assigned_at DESC`,
        { rulesetId }
      );
    }
    throw error;
  }
}

function parseJsonArray(value?: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export async function listRulesets() {
  const result = await query(
    `SELECT ruleset_id,
            name,
            version_tag,
            description,
            is_active,
            effective_from,
            effective_to,
            created_at,
            updated_at
     FROM rulesets
     ORDER BY created_at DESC`
  );
  return result.recordset;
}

export async function getRuleset(rulesetId: number) {
  const result = await query(
    `SELECT ruleset_id,
            name,
            version_tag,
            description,
            is_active,
            effective_from,
            effective_to,
            created_at,
            updated_at
     FROM rulesets
     WHERE ruleset_id = @rulesetId`,
    { rulesetId }
  );
  const ruleset = result.recordset[0];
  if (!ruleset) {
    throw NotFoundError("Ruleset not found");
  }

  const [constraintsResult, scoringResult, rankingResult, goalTypesResult] = await Promise.all([
    query(
      `SELECT min_age,
              max_age,
              max_players,
              max_foreign_players,
              squad_registration_deadline
       FROM ruleset_player_constraints
       WHERE ruleset_id = @rulesetId`,
      { rulesetId }
    ),
    query(
      `SELECT max_goal_time, accepted_goal_types
       FROM ruleset_scoring_rules
       WHERE ruleset_id = @rulesetId`,
      { rulesetId }
    ),
    query(
      `SELECT points_for_win,
              points_for_draw,
              points_for_loss,
              tie_breaking_order
       FROM ruleset_ranking_rules
       WHERE ruleset_id = @rulesetId`,
      { rulesetId }
    ),
    listGoalTypes(rulesetId, false), // Get active goal types from ruleset_goal_types
  ]);

  const assignmentsResult = await fetchSeasonAssignments(rulesetId);

  const playerConstraintsRow = constraintsResult.recordset[0];
  const scoringRulesRow = scoringResult.recordset[0];
  const rankingRulesRow = rankingResult.recordset[0];

  const playerConstraints: PlayerConstraints | null = playerConstraintsRow
    ? {
        minAge: playerConstraintsRow.min_age,
        maxAge: playerConstraintsRow.max_age,
        maxPlayers: playerConstraintsRow.max_players,
        maxForeignPlayers: playerConstraintsRow.max_foreign_players,
        squadDeadline: playerConstraintsRow.squad_registration_deadline,
      }
    : null;

  // Use goal types from ruleset_goal_types table if available, otherwise fallback to JSON array
  const goalTypesFromTable = goalTypesResult.map((gt) => gt.code);
  const scoringRules: ScoringRules | null = scoringRulesRow
    ? {
        maxGoalTime: scoringRulesRow.max_goal_time,
        acceptedGoalTypes:
          goalTypesFromTable.length > 0
            ? goalTypesFromTable
            : parseJsonArray(scoringRulesRow.accepted_goal_types),
      }
    : goalTypesFromTable.length > 0
    ? {
        maxGoalTime: 90, // Default
        acceptedGoalTypes: goalTypesFromTable,
      }
    : null;

  const rankingRules: RankingRules | null = rankingRulesRow
    ? {
        pointsForWin: rankingRulesRow.points_for_win,
        pointsForDraw: rankingRulesRow.points_for_draw,
        pointsForLoss: rankingRulesRow.points_for_loss,
        tieBreakingOrder: parseJsonArray(rankingRulesRow.tie_breaking_order),
      }
    : null;

  const seasonAssignments: SeasonAssignment[] = assignmentsResult.recordset.map((row) => ({
    seasonId: row.season_id,
    assignedAt: row.assigned_at,
    seasonName: row.season_name ?? null,
    seasonCode: row.season_code ?? null,
  }));

  return {
    ...ruleset,
    playerConstraints,
    scoringRules,
    rankingRules,
    seasonAssignments,
  };
}

export async function createRuleset(input: RulesetInput) {
  // Check for duplicate name
  const existing = await query(
    `SELECT ruleset_id, name FROM rulesets WHERE name = @name`,
    { name: input.name }
  );

  if (existing.recordset.length > 0) {
    throw BadRequestError(
      `Bộ quy tắc với tên "${input.name}" đã tồn tại. Vui lòng chọn tên khác.`
    );
  }

  const result = await query(
    `INSERT INTO rulesets (
      name,
      version_tag,
      description,
      is_active,
      effective_from,
      effective_to,
      created_by,
      created_at
    ) OUTPUT INSERTED.ruleset_id
    VALUES (
      @name,
      @versionTag,
      @description,
      0,
      @effectiveFrom,
      @effectiveTo,
      @actorId,
      SYSUTCDATETIME()
    )`,
    {
      name: input.name,
      versionTag: input.versionTag,
      description: input.description ?? null,
      effectiveFrom: input.effectiveFrom ?? null,
      effectiveTo: input.effectiveTo ?? null,
      actorId: input.actorId,
    }
  );

  const rulesetId = result.recordset[0]?.ruleset_id;

  await logEvent({
    eventType: "RULESET_CREATED",
    severity: "info",
    actorId: input.actorId,
    actorUsername: input.actorUsername,
    entityType: "RULESET",
    entityId: String(rulesetId),
  });

  return rulesetId;
}

export async function updateRuleset(rulesetId: number, input: Partial<RulesetInput>) {
  // If name is being updated, check for duplicate
  if (input.name) {
    const existing = await query(
      `SELECT ruleset_id, name FROM rulesets WHERE name = @name AND ruleset_id != @rulesetId`,
      { name: input.name, rulesetId }
    );

    if (existing.recordset.length > 0) {
      throw BadRequestError(
        `Bộ quy tắc với tên "${input.name}" đã tồn tại. Vui lòng chọn tên khác.`
      );
    }
  }

  await query(
    `UPDATE rulesets
     SET name = COALESCE(@name, name),
         version_tag = COALESCE(@versionTag, version_tag),
         description = COALESCE(@description, description),
         effective_from = COALESCE(@effectiveFrom, effective_from),
         effective_to = COALESCE(@effectiveTo, effective_to),
         updated_by = @actorId,
         updated_at = SYSUTCDATETIME()
     WHERE ruleset_id = @rulesetId`,
    {
      rulesetId,
      name: input.name ?? null,
      versionTag: input.versionTag ?? null,
      description: input.description ?? null,
      effectiveFrom: input.effectiveFrom ?? null,
      effectiveTo: input.effectiveTo ?? null,
      actorId: input.actorId ?? null,
    }
  );

  await logEvent({
    eventType: "RULESET_UPDATED",
    severity: "info",
    actorId: input.actorId,
    actorUsername: input.actorUsername,
    entityType: "RULESET",
    entityId: String(rulesetId),
  });

  return getRuleset(rulesetId);
}

export async function publishRuleset(rulesetId: number, actorId: number, actorUsername: string) {
  await query(
    `UPDATE rulesets
     SET is_active = 1,
         updated_at = SYSUTCDATETIME(),
         updated_by = @actorId
     WHERE ruleset_id = @rulesetId`,
    { rulesetId, actorId }
  );

  await logEvent({
    eventType: "RULESET_PUBLISHED",
    severity: "info",
    actorId,
    actorUsername,
    entityType: "RULESET",
    entityId: String(rulesetId),
  });
}

export async function deleteRuleset(rulesetId: number, actorId: number, actorUsername: string) {
  const existing = await query(
    `SELECT ruleset_id, name
     FROM rulesets
     WHERE ruleset_id = @rulesetId`,
    { rulesetId }
  );

  if (!existing.recordset[0]) {
    throw NotFoundError("Ruleset not found");
  }

  await transaction(async (tx) => {
    const request = tx.request();
    request.input("rulesetId", rulesetId);

    await request.query(`
      DELETE FROM season_ruleset_assignments WHERE ruleset_id = @rulesetId;
      DELETE FROM rulesets WHERE ruleset_id = @rulesetId;
    `);
  });

  await logEvent({
    eventType: "RULESET_DELETED",
    severity: "warning",
    actorId,
    actorUsername,
    entityType: "RULESET",
    entityId: String(rulesetId),
    payload: { name: existing.recordset[0].name },
  });
}

export async function upsertPlayerConstraints(rulesetId: number, input: ConstraintsInput) {
  await query(
    `MERGE ruleset_player_constraints AS target
     USING (SELECT @rulesetId AS ruleset_id) AS src
     ON target.ruleset_id = src.ruleset_id
     WHEN MATCHED THEN
       UPDATE SET min_age = @minAge,
                  max_age = @maxAge,
                  max_players = @maxPlayers,
                  max_foreign_players = @maxForeignPlayers,
                  squad_registration_deadline = @squadDeadline
     WHEN NOT MATCHED THEN
       INSERT (ruleset_id, min_age, max_age, max_players, max_foreign_players, squad_registration_deadline)
       VALUES (@rulesetId, @minAge, @maxAge, @maxPlayers, @maxForeignPlayers, @squadDeadline);`,
    {
      rulesetId,
      minAge: input.minAge,
      maxAge: input.maxAge,
      maxPlayers: input.maxPlayers,
      maxForeignPlayers: input.maxForeignPlayers,
      squadDeadline: input.squadDeadline ?? null,
    }
  );
}

export async function upsertScoringRules(rulesetId: number, input: ScoringInput) {
  await query(
    `MERGE ruleset_scoring_rules AS target
     USING (SELECT @rulesetId AS ruleset_id) AS src
     ON target.ruleset_id = src.ruleset_id
     WHEN MATCHED THEN
       UPDATE SET max_goal_time = @maxGoalTime,
                  accepted_goal_types = @acceptedGoalTypes
     WHEN NOT MATCHED THEN
       INSERT (ruleset_id, max_goal_time, accepted_goal_types)
       VALUES (@rulesetId, @maxGoalTime, @acceptedGoalTypes);`,
    {
      rulesetId,
      maxGoalTime: input.maxGoalTime,
      acceptedGoalTypes: JSON.stringify(input.acceptedGoalTypes),
    }
  );
}

export async function upsertRankingRules(rulesetId: number, input: RankingInput) {
  await query(
    `MERGE ruleset_ranking_rules AS target
     USING (SELECT @rulesetId AS ruleset_id) AS src
     ON target.ruleset_id = src.ruleset_id
     WHEN MATCHED THEN
       UPDATE SET points_for_win = @pointsForWin,
                  points_for_draw = @pointsForDraw,
                  points_for_loss = @pointsForLoss,
                  tie_breaking_order = @tieBreakingOrder
     WHEN NOT MATCHED THEN
       INSERT (ruleset_id, points_for_win, points_for_draw, points_for_loss, tie_breaking_order)
       VALUES (@rulesetId, @pointsForWin, @pointsForDraw, @pointsForLoss, @tieBreakingOrder);`,
    {
      rulesetId,
      pointsForWin: input.pointsForWin,
      pointsForDraw: input.pointsForDraw,
      pointsForLoss: input.pointsForLoss,
      tieBreakingOrder: JSON.stringify(input.tieBreakingOrder),
    }
  );
}

export async function assignRulesetToSeason(
  seasonId: number,
  rulesetId: number,
  actorId: number
) {
  await transaction(async (tx) => {
    const request = tx.request();
    request.input("seasonId", seasonId);
    request.input("rulesetId", rulesetId);
    request.input("actorId", actorId);
    await request.query(`
      MERGE season_ruleset_assignments AS target
      USING (SELECT @seasonId AS season_id) AS src
      ON target.season_id = src.season_id
      WHEN MATCHED THEN
        UPDATE SET ruleset_id = @rulesetId,
                   assigned_at = SYSUTCDATETIME(),
                   assigned_by = @actorId
      WHEN NOT MATCHED THEN
        INSERT (season_id, ruleset_id, assigned_at, assigned_by)
        VALUES (@seasonId, @rulesetId, SYSUTCDATETIME(), @actorId);`);
  });

  await logEvent({
    eventType: "RULESET_ASSIGNED_TO_SEASON",
    severity: "info",
    actorId,
    entityType: "SEASON",
    entityId: String(seasonId),
    payload: { rulesetId },
  });
}
