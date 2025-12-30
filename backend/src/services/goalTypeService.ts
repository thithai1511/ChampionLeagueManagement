import { query } from "../db/sqlServer";
import { NotFoundError, BadRequestError } from "../utils/httpError";
import { logEvent } from "./auditService";

export interface GoalType {
  goalTypeId: number;
  rulesetId: number;
  code: string;
  name: string;
  description?: string | null;
  minuteMin: number;
  minuteMax: number;
  isActive: boolean;
}

export interface GoalTypeInput {
  code: string;
  name: string;
  description?: string;
  minuteMin?: number;
  minuteMax?: number;
  isActive?: boolean;
}

export interface GoalTypeUpdate extends Partial<GoalTypeInput> {
  goalTypeId: number;
}

/**
 * Lấy danh sách tất cả goal types của một ruleset
 */
export async function listGoalTypes(rulesetId: number, includeInactive = false) {
  const result = await query(
    `SELECT goal_type_id AS goalTypeId,
            ruleset_id AS rulesetId,
            code,
            name,
            description,
            minute_min AS minuteMin,
            minute_max AS minuteMax,
            is_active AS isActive
     FROM ruleset_goal_types
     WHERE ruleset_id = @rulesetId
     ${includeInactive ? "" : "AND is_active = 1"}
     ORDER BY code ASC`,
    { rulesetId }
  );
  return result.recordset as GoalType[];
}

/**
 * Lấy một goal type theo ID
 */
export async function getGoalType(goalTypeId: number) {
  const result = await query(
    `SELECT goal_type_id AS goalTypeId,
            ruleset_id AS rulesetId,
            code,
            name,
            description,
            minute_min AS minuteMin,
            minute_max AS minuteMax,
            is_active AS isActive
     FROM ruleset_goal_types
     WHERE goal_type_id = @goalTypeId`,
    { goalTypeId }
  );

  const goalType = result.recordset[0] as GoalType | undefined;
  if (!goalType) {
    throw NotFoundError("Goal type not found");
  }

  return goalType;
}

/**
 * Tạo mới goal type
 */
export async function createGoalType(
  rulesetId: number,
  input: GoalTypeInput,
  actorId: number,
  actorUsername: string
) {
  // Validate ruleset exists
  const rulesetCheck = await query(
    `SELECT ruleset_id FROM rulesets WHERE ruleset_id = @rulesetId`,
    { rulesetId }
  );
  if (!rulesetCheck.recordset[0]) {
    throw NotFoundError("Ruleset not found");
  }

  // Check if code already exists for this ruleset
  const existing = await query(
    `SELECT goal_type_id FROM ruleset_goal_types 
     WHERE ruleset_id = @rulesetId AND code = @code`,
    { rulesetId, code: input.code }
  );
  if (existing.recordset[0]) {
    throw BadRequestError(`Goal type with code "${input.code}" already exists for this ruleset`);
  }

  // Validate minute range
  const minuteMin = input.minuteMin ?? 0;
  const minuteMax = input.minuteMax ?? 90;
  if (minuteMin > minuteMax) {
    throw BadRequestError("minuteMin must be less than or equal to minuteMax");
  }
  if (minuteMin < 0 || minuteMin > 120) {
    throw BadRequestError("minuteMin must be between 0 and 120");
  }
  if (minuteMax < 0 || minuteMax > 150) {
    throw BadRequestError("minuteMax must be between 0 and 150");
  }

  const result = await query(
    `INSERT INTO ruleset_goal_types (
      ruleset_id,
      code,
      name,
      description,
      minute_min,
      minute_max,
      is_active
    ) OUTPUT INSERTED.goal_type_id
    VALUES (
      @rulesetId,
      @code,
      @name,
      @description,
      @minuteMin,
      @minuteMax,
      @isActive
    )`,
    {
      rulesetId,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      minuteMin,
      minuteMax,
      isActive: input.isActive !== undefined ? (input.isActive ? 1 : 0) : 1,
    }
  );

  const goalTypeId = result.recordset[0]?.goal_type_id;

  await logEvent({
    eventType: "GOAL_TYPE_CREATED",
    severity: "info",
    actorId,
    actorUsername,
    entityType: "GOAL_TYPE",
    entityId: String(goalTypeId),
    payload: { rulesetId, code: input.code, name: input.name },
  });

  return getGoalType(goalTypeId);
}

/**
 * Cập nhật goal type
 */
export async function updateGoalType(
  goalTypeId: number,
  input: Partial<GoalTypeInput>,
  actorId: number,
  actorUsername: string
) {
  const existing = await getGoalType(goalTypeId);

  // If code is being changed, check for duplicates
  if (input.code && input.code !== existing.code) {
    const duplicate = await query(
      `SELECT goal_type_id FROM ruleset_goal_types 
       WHERE ruleset_id = @rulesetId AND code = @code AND goal_type_id <> @goalTypeId`,
      { rulesetId: existing.rulesetId, code: input.code, goalTypeId }
    );
    if (duplicate.recordset[0]) {
      throw BadRequestError(`Goal type with code "${input.code}" already exists for this ruleset`);
    }
  }

  // Validate minute range if provided
  const minuteMin = input.minuteMin ?? existing.minuteMin;
  const minuteMax = input.minuteMax ?? existing.minuteMax;
  if (minuteMin > minuteMax) {
    throw BadRequestError("minuteMin must be less than or equal to minuteMax");
  }
  if (minuteMin < 0 || minuteMin > 120) {
    throw BadRequestError("minuteMin must be between 0 and 120");
  }
  if (minuteMax < 0 || minuteMax > 150) {
    throw BadRequestError("minuteMax must be between 0 and 150");
  }

  await query(
    `UPDATE ruleset_goal_types
     SET code = COALESCE(@code, code),
         name = COALESCE(@name, name),
         description = COALESCE(@description, description),
         minute_min = COALESCE(@minuteMin, minute_min),
         minute_max = COALESCE(@minuteMax, minute_max),
         is_active = COALESCE(@isActive, is_active)
     WHERE goal_type_id = @goalTypeId`,
    {
      goalTypeId,
      code: input.code ?? null,
      name: input.name ?? null,
      description: input.description !== undefined ? input.description : null,
      minuteMin: input.minuteMin ?? null,
      minuteMax: input.minuteMax ?? null,
      isActive: input.isActive !== undefined ? (input.isActive ? 1 : 0) : null,
    }
  );

  await logEvent({
    eventType: "GOAL_TYPE_UPDATED",
    severity: "info",
    actorId,
    actorUsername,
    entityType: "GOAL_TYPE",
    entityId: String(goalTypeId),
    payload: { rulesetId: existing.rulesetId, changes: input },
  });

  return getGoalType(goalTypeId);
}

/**
 * Xóa goal type
 */
export async function deleteGoalType(
  goalTypeId: number,
  actorId: number,
  actorUsername: string
) {
  const existing = await getGoalType(goalTypeId);

  // Check if goal type is being used in match events
  const usageCheck = await query(
    `SELECT COUNT(*) AS usage_count
     FROM match_events
     WHERE goal_type_code = @code AND ruleset_id = @rulesetId`,
    { code: existing.code, rulesetId: existing.rulesetId }
  );
  const usageCount = usageCheck.recordset[0]?.usage_count ?? 0;
  if (usageCount > 0) {
    throw BadRequestError(
      `Cannot delete goal type: it is being used in ${usageCount} match event(s). Consider deactivating it instead.`
    );
  }

  await query(
    `DELETE FROM ruleset_goal_types WHERE goal_type_id = @goalTypeId`,
    { goalTypeId }
  );

  await logEvent({
    eventType: "GOAL_TYPE_DELETED",
    severity: "warning",
    actorId,
    actorUsername,
    entityType: "GOAL_TYPE",
    entityId: String(goalTypeId),
    payload: { rulesetId: existing.rulesetId, code: existing.code, name: existing.name },
  });
}

/**
 * Validate goal type code for a ruleset
 */
export async function validateGoalTypeCode(
  rulesetId: number,
  code: string,
  excludeGoalTypeId?: number
): Promise<boolean> {
  const result = await query(
    `SELECT goal_type_id
     FROM ruleset_goal_types
     WHERE ruleset_id = @rulesetId 
     AND code = @code
     AND is_active = 1
     ${excludeGoalTypeId ? "AND goal_type_id <> @excludeGoalTypeId" : ""}`,
    { rulesetId, code, excludeGoalTypeId: excludeGoalTypeId ?? null }
  );
  return result.recordset.length > 0;
}

/**
 * Get active goal type codes for a ruleset (for validation)
 */
export async function getActiveGoalTypeCodes(rulesetId: number): Promise<string[]> {
  const result = await query(
    `SELECT code
     FROM ruleset_goal_types
     WHERE ruleset_id = @rulesetId AND is_active = 1
     ORDER BY code ASC`,
    { rulesetId }
  );
  return result.recordset.map((row) => row.code);
}

