import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import {
  listGoalTypes,
  getGoalType,
  createGoalType,
  updateGoalType,
  deleteGoalType,
} from "../services/goalTypeService";
import { AuthenticatedRequest } from "../types";

const router = Router();

// Lấy danh sách goal types của một ruleset
router.get(
  "/rulesets/:rulesetId/goal-types",
  requireAuth,
  async (req, res) => {
    const rulesetId = Number(req.params.rulesetId);
    const includeInactive = req.query.includeInactive === "true";
    const goalTypes = await listGoalTypes(rulesetId, includeInactive);
    res.json(goalTypes);
  }
);

// Lấy một goal type theo ID
router.get(
  "/goal-types/:id",
  requireAuth,
  async (req, res) => {
    const goalType = await getGoalType(Number(req.params.id));
    res.json(goalType);
  }
);

// Schema validation
const goalTypeCreateSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  minuteMin: z.number().int().min(0).max(120).optional(),
  minuteMax: z.number().int().min(0).max(150).optional(),
  isActive: z.boolean().optional(),
});

const goalTypeUpdateSchema = goalTypeCreateSchema.partial();

// Tạo mới goal type (chỉ admin)
router.post(
  "/rulesets/:rulesetId/goal-types",
  requireAuth,
  requirePermission("manage_rulesets"),
  validate({ schema: goalTypeCreateSchema }),
  async (req: AuthenticatedRequest, res) => {
    const goalType = await createGoalType(
      Number(req.params.rulesetId),
      req.body,
      req.user!.sub,
      req.user!.username
    );
    res.status(201).json(goalType);
  }
);

// Cập nhật goal type (chỉ admin)
router.put(
  "/goal-types/:id",
  requireAuth,
  requirePermission("manage_rulesets"),
  validate({ schema: goalTypeUpdateSchema }),
  async (req: AuthenticatedRequest, res) => {
    const goalType = await updateGoalType(
      Number(req.params.id),
      req.body,
      req.user!.sub,
      req.user!.username
    );
    res.json(goalType);
  }
);

// Xóa goal type (chỉ admin)
router.delete(
  "/goal-types/:id",
  requireAuth,
  requirePermission("manage_rulesets"),
  async (req: AuthenticatedRequest, res) => {
    await deleteGoalType(
      Number(req.params.id),
      req.user!.sub,
      req.user!.username
    );
    res.status(204).send();
  }
);

export default router;



