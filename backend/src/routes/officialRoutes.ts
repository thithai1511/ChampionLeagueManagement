import { Router } from "express";
import { z } from "zod";
import { requireAnyPermission, requireAuth } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import {
  listOfficials,
  getOfficialById,
  createOfficial,
  updateOfficial,
  deleteOfficial,
  getMatchOfficials,
  assignOfficialToMatch,
  removeOfficialFromMatch,
  updateMatchOfficialAssignment,
  getAvailableOfficialsForRole,
  ROLE_LABELS,
  SPECIALTY_LABELS,
} from "../services/officialService";
import { AuthenticatedRequest } from "../types";

const router = Router();
const requireOfficialManagement = requireAnyPermission("manage_matches", "manage_teams");

// === OFFICIAL MANAGEMENT ===

const createOfficialSchema = z.object({
  userId: z.number().int().positive().optional().nullable(),
  fullName: z.string().min(2).max(255),
  roleSpecialty: z.enum([
    "referee",
    "assistant",
    "fourth_official",
    "match_commissioner",
    "supervisor",
    "var",
    "other",
  ]),
  licenseNumber: z.string().max(50).optional().nullable(),
  federationLevel: z.string().max(100).optional().nullable(),
  status: z.enum(["active", "inactive", "suspended"]).optional().default("active"),
  notes: z.string().max(512).optional().nullable(),
});

const updateOfficialSchema = createOfficialSchema.partial();

/**
 * GET /officials
 * List all officials
 */
router.get("/", requireAuth, requireOfficialManagement, async (req, res, next) => {
  try {
    const { status, roleSpecialty, search } = req.query;
    const officials = await listOfficials({
      status: status as string | undefined,
      roleSpecialty: roleSpecialty as string | undefined,
      search: search as string | undefined,
    });
    res.json({
      data: officials,
      total: officials.length,
      roleLabels: ROLE_LABELS,
      specialtyLabels: SPECIALTY_LABELS,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /officials/metadata
 * Get metadata for officials (role labels, specialty labels)
 */
router.get("/metadata", requireAuth, async (_req, res) => {
  res.json({
    roleLabels: ROLE_LABELS,
    specialtyLabels: SPECIALTY_LABELS,
    statuses: [
      { value: "active", label: "Hoạt động" },
      { value: "inactive", label: "Không hoạt động" },
      { value: "suspended", label: "Đình chỉ" },
    ],
    specialties: [
      { value: "referee", label: "Trọng tài chính" },
      { value: "assistant", label: "Trọng tài biên" },
      { value: "fourth_official", label: "Trọng tài thứ 4" },
      { value: "match_commissioner", label: "Giám sát trận đấu" },
      { value: "supervisor", label: "Giám sát viên" },
      { value: "var", label: "VAR" },
      { value: "other", label: "Khác" },
    ],
    matchRoles: [
      { value: "referee", label: "Trọng tài chính" },
      { value: "assistant_1", label: "Trọng tài biên 1" },
      { value: "assistant_2", label: "Trọng tài biên 2" },
      { value: "fourth_official", label: "Trọng tài thứ 4" },
      { value: "match_commissioner", label: "Giám sát trận đấu" },
      { value: "video_assistant", label: "VAR" },
    ],
  });
});

/**
 * GET /officials/:id
 * Get official by ID
 */
router.get("/:id", requireAuth, requireOfficialManagement, async (req, res, next) => {
  try {
    const officialId = parseInt(req.params.id, 10);
    if (isNaN(officialId)) {
      return res.status(400).json({ error: "Invalid official ID" });
    }

    const official = await getOfficialById(officialId);
    if (!official) {
      return res.status(404).json({ error: "Official not found" });
    }

    res.json({ data: official });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /officials
 * Create a new official
 */
router.post(
  "/",
  requireAuth,
  requireOfficialManagement,
  validate({ schema: createOfficialSchema }),
  async (req, res, next) => {
    try {
      const official = await createOfficial(req.body);
      res.status(201).json({
        success: true,
        message: "Đã tạo trọng tài/giám sát thành công",
        data: official,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /officials/:id
 * Update an official
 */
router.put(
  "/:id",
  requireAuth,
  requireOfficialManagement,
  validate({ schema: updateOfficialSchema }),
  async (req, res, next) => {
    try {
      const officialId = parseInt(req.params.id, 10);
      if (isNaN(officialId)) {
        return res.status(400).json({ error: "Invalid official ID" });
      }

      const official = await updateOfficial(officialId, req.body);
      if (!official) {
        return res.status(404).json({ error: "Official not found" });
      }

      res.json({
        success: true,
        message: "Đã cập nhật thông tin thành công",
        data: official,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /officials/:id
 * Delete an official
 */
router.delete("/:id", requireAuth, requireOfficialManagement, async (req, res, next) => {
  try {
    const officialId = parseInt(req.params.id, 10);
    if (isNaN(officialId)) {
      return res.status(400).json({ error: "Invalid official ID" });
    }

    const deleted = await deleteOfficial(officialId);
    if (!deleted) {
      return res.status(404).json({ error: "Official not found" });
    }

    res.json({ success: true, message: "Đã xóa trọng tài/giám sát" });
  } catch (error) {
    next(error);
  }
});

// === MATCH OFFICIAL ASSIGNMENTS ===

/**
 * GET /officials/match/:matchId/assignments
 * Get officials assigned to a match
 */
router.get(
  "/match/:matchId/assignments",
  requireAuth,
  requireOfficialManagement,
  async (req, res, next) => {
    try {
      const matchId = parseInt(req.params.matchId, 10);
      if (isNaN(matchId)) {
        return res.status(400).json({ error: "Invalid match ID" });
      }

      const assignments = await getMatchOfficials(matchId);
      res.json({
        data: assignments,
        roleLabels: ROLE_LABELS,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /officials/match/:matchId/available/:roleCode
 * Get available officials for a specific role in a match
 */
router.get(
  "/match/:matchId/available/:roleCode",
  requireAuth,
  requireOfficialManagement,
  async (req, res, next) => {
    try {
      const roleCode = req.params.roleCode;
      const officials = await getAvailableOfficialsForRole(roleCode);
      res.json({ data: officials });
    } catch (error) {
      next(error);
    }
  }
);

const assignOfficialSchema = z.object({
  officialId: z.number().int().positive(),
  roleCode: z.enum([
    "referee",
    "assistant_1",
    "assistant_2",
    "fourth_official",
    "match_commissioner",
    "video_assistant",
  ]),
  notes: z.string().max(255).optional().nullable(),
});

/**
 * POST /officials/match/:matchId/assign
 * Assign an official to a match
 */
router.post(
  "/match/:matchId/assign",
  requireAuth,
  requireOfficialManagement,
  validate({ schema: assignOfficialSchema }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const matchId = parseInt(req.params.matchId, 10);
      if (isNaN(matchId)) {
        return res.status(400).json({ error: "Invalid match ID" });
      }

      const { officialId, roleCode, notes } = req.body;
      const assignedBy = req.user!.sub;

      const assignment = await updateMatchOfficialAssignment(
        matchId,
        roleCode,
        officialId,
        assignedBy,
        notes
      );

      res.json({
        success: true,
        message: "Đã phân công trọng tài thành công",
        data: assignment,
      });
    } catch (error: any) {
      // Handle duplicate key errors
      if (error.message?.includes("UQ_match_official")) {
        return res.status(400).json({
          error: "Trọng tài này đã được phân công vào trận đấu",
        });
      }
      next(error);
    }
  }
);

/**
 * DELETE /officials/match/:matchId/role/:roleCode
 * Remove an official assignment from a match
 */
router.delete(
  "/match/:matchId/role/:roleCode",
  requireAuth,
  requireOfficialManagement,
  async (req, res, next) => {
    try {
      const matchId = parseInt(req.params.matchId, 10);
      const roleCode = req.params.roleCode;

      if (isNaN(matchId)) {
        return res.status(400).json({ error: "Invalid match ID" });
      }

      const removed = await removeOfficialFromMatch(matchId, roleCode);
      if (!removed) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      res.json({ success: true, message: "Đã hủy phân công" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

