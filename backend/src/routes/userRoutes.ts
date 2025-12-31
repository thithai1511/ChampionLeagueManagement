import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import {
  assignRole,
  createUser,
  deleteUser,
  getUserById,
  getUserRolesList,
  listUsers,
  removeRole,
  updateUser,
} from "../services/userService";
import { assignTeamToUser, listUserTeams, removeTeamFromUser } from "../services/userTeamService";
import { assignOfficialToUser, getUserOfficial, removeOfficialFromUser } from "../services/userOfficialService";
import { AuthenticatedRequest } from "../types";

const router = Router();

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

router.get(
  "/",
  requireAuth,
  requirePermission("manage_users"),
  validate({ schema: paginationSchema, target: "query" }),
  async (req, res) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 25);
    const result = await listUsers(page, pageSize);
    res.json(result);
  }
);

router.get(
  "/:id",
  requireAuth,
  requirePermission("manage_users"),
  async (req, res) => {
    const user = await getUserById(Number(req.params.id));
    res.json(user);
  }
);

const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

router.post(
  "/",
  requireAuth,
  requirePermission("manage_users"),
  validate({ schema: createUserSchema }),
  async (req: AuthenticatedRequest, res) => {
    const metadata = {
      ip: req.ip,
      userAgent: req.get("user-agent") ?? null,
      email: req.body.email,
      actorUsername: req.user!.username ?? null,
    };
    const userId = await createUser({
      ...req.body,
      createdBy: req.user!.sub,
      metadata,
    });
    res.status(201).json({ userId });
  }
);

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  password: z.string().min(8).optional(),
});

router.put(
  "/:id",
  requireAuth,
  requirePermission("manage_users"),
  validate({ schema: updateUserSchema }),
  async (req: AuthenticatedRequest, res) => {
    const user = await updateUser(Number(req.params.id), {
      ...req.body,
      updatedBy: req.user!.sub,
    });
    res.json(user);
  }
);

router.delete(
  "/:id",
  requireAuth,
  requirePermission("manage_users"),
  async (req: AuthenticatedRequest, res) => {
    await deleteUser(Number(req.params.id), req.user!.sub);
    res.status(204).send();
  }
);

const roleAssignmentSchema = z.object({
  roleId: z.number().int().positive(),
});

router.get(
  "/:id/roles",
  requireAuth,
  requirePermission("manage_users"),
  async (req, res) => {
    const roles = await getUserRolesList(Number(req.params.id));
    res.json(roles);
  }
);

router.post(
  "/:id/roles",
  requireAuth,
  requirePermission("manage_users"),
  validate({ schema: roleAssignmentSchema }),
  async (req: AuthenticatedRequest, res) => {
    await assignRole(Number(req.params.id), req.body.roleId, req.user!.sub);
    res.status(204).send();
  }
);

router.delete(
  "/:id/roles/:roleId",
  requireAuth,
  requirePermission("manage_users"),
  async (req: AuthenticatedRequest, res) => {
    await removeRole(Number(req.params.id), Number(req.params.roleId), req.user!.sub);
    res.status(204).send();
  }
);

router.get(
  "/:id/teams",
  requireAuth,
  requirePermission("manage_users"),
  async (req, res) => {
    const teams = await listUserTeams(Number(req.params.id));
    res.json(teams);
  }
);

const teamAssignmentSchema = z.object({
  teamId: z.number().int().positive(),
});

router.post(
  "/:id/teams",
  requireAuth,
  requirePermission("manage_users"),
  validate({ schema: teamAssignmentSchema }),
  async (req: AuthenticatedRequest, res) => {
    await assignTeamToUser(Number(req.params.id), req.body.teamId, req.user!.sub);
    res.status(204).send();
  }
);

router.delete(
  "/:id/teams/:teamId",
  requireAuth,
  requirePermission("manage_users"),
  async (req: AuthenticatedRequest, res) => {
    await removeTeamFromUser(Number(req.params.id), Number(req.params.teamId), req.user!.sub);
    res.status(204).send();
  }
);

router.get(
  "/:id/official",
  requireAuth,
  requirePermission("manage_users"),
  async (req, res) => {
    const official = await getUserOfficial(Number(req.params.id));
    if (!official) {
      return res.status(404).json({ error: "No official assigned to this user" });
    }
    res.json({ data: official });
  }
);

const officialAssignmentSchema = z.object({
  officialId: z.number().int().positive(),
});

router.post(
  "/:id/official",
  requireAuth,
  requirePermission("manage_users"),
  validate({ schema: officialAssignmentSchema }),
  async (req: AuthenticatedRequest, res) => {
    await assignOfficialToUser(Number(req.params.id), req.body.officialId, req.user!.sub);
    res.status(204).send();
  }
);

router.delete(
  "/:id/official",
  requireAuth,
  requirePermission("manage_users"),
  async (req: AuthenticatedRequest, res) => {
    await removeOfficialFromUser(Number(req.params.id), req.user!.sub);
    res.status(204).send();
  }
);

export default router;
