import { query } from "../db/sqlServer";
import { BadRequestError, NotFoundError } from "../utils/httpError";
import { logEvent } from "./auditService";

interface RoleInput {
  code: string;
  name: string;
  description?: string;
  actorId: number;
}

async function ensureRoleExists(roleId: number) {
  const result = await query(
    `SELECT role_id FROM roles WHERE role_id = @roleId`,
    { roleId }
  );
  if (result.recordset.length === 0) {
    throw NotFoundError("Role not found");
  }
  return result.recordset[0];
}

async function ensurePermissionExists(permissionId: number) {
  const result = await query(
    `SELECT permission_id FROM permissions WHERE permission_id = @permissionId`,
    { permissionId }
  );
  if (result.recordset.length === 0) {
    throw NotFoundError("Permission not found");
  }
  return result.recordset[0];
}

export async function listRoles() {
  const result = await query(
    `SELECT role_id, code, name, description, is_system_role
     FROM roles
     ORDER BY name`
  );
  
  // Auto-seed roles if empty (development fallback)
  if (result.recordset.length === 0) {
    console.warn("⚠️ No roles found in database. This might indicate missing seed data.");
  }
  
  return result.recordset;
}

export async function createRole(input: RoleInput) {
  const existing = await query(
    `SELECT role_id FROM roles WHERE code = @code`,
    { code: input.code }
  );
  if (existing.recordset.length > 0) {
    throw BadRequestError("Role code already exists");
  }

  const result = await query(
    `INSERT INTO roles (code, name, description, is_system_role)
     OUTPUT INSERTED.role_id
     VALUES (@code, @name, @description, 0)`,
    {
      code: input.code,
      name: input.name,
      description: input.description ?? null,
    }
  );

  const roleId = result.recordset[0]?.role_id;
  await logEvent({
    eventType: "ROLE_CREATED",
    severity: "info",
    actorId: input.actorId,
    entityType: "ROLE",
    entityId: String(roleId),
    payload: { code: input.code },
  });

  return roleId;
}

export async function getRolePermissions(roleId: number) {
  const result = await query(
    `SELECT p.permission_id, p.code, p.name, p.description
     FROM role_permissions rp
     JOIN permissions p ON rp.permission_id = p.permission_id
     WHERE rp.role_id = @roleId`,
    { roleId }
  );
  return result.recordset;
}

export async function updateRolePermissions(
  roleId: number,
  permissionIds: number[],
  actorId: number
) {
  await ensureRoleExists(roleId);

  await query(
    `DELETE FROM role_permissions WHERE role_id = @roleId`,
    { roleId }
  );

  if (permissionIds.length > 0) {
    const values = permissionIds
      .map((_, index) => `(@roleId, @permission${index})`)
      .join(", ");
    const params: Record<string, unknown> = { roleId };
    permissionIds.forEach((id, index) => {
      params[`permission${index}`] = id;
    });

    await query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ${values}`,
      params
    );
  }

  await logEvent({
    eventType: "ROLE_PERMISSIONS_UPDATED",
    severity: "info",
    actorId,
    entityType: "ROLE",
    entityId: String(roleId),
    payload: { permissionIds },
  });
}

export async function addPermissionToRole(roleId: number, permissionId: number, actorId: number) {
  await ensureRoleExists(roleId);
  await ensurePermissionExists(permissionId);

  await query(
    `IF NOT EXISTS (
        SELECT 1
        FROM role_permissions
        WHERE role_id = @roleId AND permission_id = @permissionId
     )
     INSERT INTO role_permissions (role_id, permission_id)
     VALUES (@roleId, @permissionId);`,
    { roleId, permissionId }
  );

  await logEvent({
    eventType: "ROLE_PERMISSION_ATTACHED",
    severity: "info",
    actorId,
    entityType: "ROLE",
    entityId: String(roleId),
    payload: { permissionId },
  });
}

export async function removePermissionFromRole(
  roleId: number,
  permissionId: number,
  actorId: number
) {
  await ensureRoleExists(roleId);
  await ensurePermissionExists(permissionId);

  await query(
    `DELETE FROM role_permissions
     WHERE role_id = @roleId AND permission_id = @permissionId`,
    { roleId, permissionId }
  );

  await logEvent({
    eventType: "ROLE_PERMISSION_REMOVED",
    severity: "info",
    actorId,
    entityType: "ROLE",
    entityId: String(roleId),
    payload: { permissionId },
  });
}
