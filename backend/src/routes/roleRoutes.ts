import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import {
  addPermissionToRole,
  createRole,
  getRolePermissions,
  listRoles,
  removePermissionFromRole,
  updateRolePermissions,
} from "../services/roleService";
import { AuthenticatedRequest } from "../types";

const router = Router();

router.get(
  "/",
  requireAuth,
  async (_req, res) => {
    const roles = await listRoles();
    res.json(roles);
  }
);

const createRoleSchema = z.object({
  code: z.string().min(3).max(50),
  name: z.string().min(3).max(100),
  description: z.string().max(512).optional(),
});

router.post(
  "/",
  requireAuth,
  requirePermission("manage_users"),
  validate({ schema: createRoleSchema }),
  async (req: AuthenticatedRequest, res) => {
    const roleId = await createRole({
      ...req.body,
      actorId: req.user!.sub,
    });
    res.status(201).json({ roleId });
  }
);

router.get(
  "/:id/permissions",
  requireAuth,
  requirePermission("manage_users"),
  async (req, res) => {
    const permissions = await getRolePermissions(Number(req.params.id));
    res.json(permissions);
  }
);

const permissionAssignmentSchema = z.object({
  permissionId: z.number().int().positive(),
});

router.post(
  "/:id/permissions",
  requireAuth,
  requirePermission("manage_users"),
  validate({ schema: permissionAssignmentSchema }),
  async (req: AuthenticatedRequest, res) => {
    await addPermissionToRole(Number(req.params.id), req.body.permissionId, req.user!.sub);
    res.status(204).send();
  }
);

const updatePermissionsSchema = z.object({
  permissionIds: z.array(z.number().int().positive()).default([]),
});

router.put(
  "/:id/permissions",
  requireAuth,
  requirePermission("manage_users"),
  validate({ schema: updatePermissionsSchema }),
  async (req: AuthenticatedRequest, res) => {
    await updateRolePermissions(Number(req.params.id), req.body.permissionIds, req.user!.sub);
    res.status(204).send();
  }
);

router.delete(
  "/:id/permissions/:permissionId",
  requireAuth,
  requirePermission("manage_users"),
  async (req: AuthenticatedRequest, res) => {
    await removePermissionFromRole(
      Number(req.params.id),
      Number(req.params.permissionId),
      req.user!.sub
    );
    res.status(204).send();
  }
);

export default router;
