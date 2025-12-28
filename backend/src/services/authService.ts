import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt, { type SignOptions, type Secret } from "jsonwebtoken";
import { query } from "../db/sqlServer";
import { appConfig } from "../config";
import { HttpError, UnauthorizedError } from "../utils/httpError";
import { logEvent } from "./auditService";
import { getUserTeamIds } from "./userTeamService";

interface UserRecord {
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password_hash: string | Buffer;
  status: string;
  last_login_at: Date | null;
  must_reset_password: boolean;
  mfa_enabled: boolean;
}

interface RoleRecord {
  code: string;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const LEGACY_SALT_ROUNDS = 10;
const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

function normalizePasswordBuffer(passwordHash: string | Buffer | null | undefined) {
  if (!passwordHash) {
    return Buffer.alloc(0);
  }
  return Buffer.isBuffer(passwordHash) ? passwordHash : Buffer.from(passwordHash, "utf8");
}

function isBcryptHash(hash: string) {
  return BCRYPT_PATTERN.test(hash.trim());
}

async function upgradeLegacyPasswordHash(userId: number, password: string) {
  try {
    const newHash = await bcrypt.hash(password, LEGACY_SALT_ROUNDS);
    await query(
      `UPDATE user_accounts
       SET password_hash = @passwordHash,
           updated_at = SYSUTCDATETIME(),
           updated_by = COALESCE(updated_by, @userId)
       WHERE user_id = @userId`,
      {
        passwordHash: Buffer.from(newHash, "utf8"),
        userId,
      }
    );
  } catch (error) {
    console.warn("Unable to upgrade legacy password hash", { userId, error });
  }
}

async function verifyPassword(password: string, storedHash: string | Buffer, userId: number) {
  const hashBuffer = normalizePasswordBuffer(storedHash);
  if (hashBuffer.length === 0) {
    return false;
  }

  const asString = hashBuffer.toString("utf8").replace(/\0+$/, "");
  if (asString && isBcryptHash(asString)) {
    return bcrypt.compare(password, asString);
  }

  const legacyDigest = crypto.createHash("sha512").update(password, "utf8").digest();
  if (legacyDigest.length !== hashBuffer.length) {
    return false;
  }

  const matches = crypto.timingSafeEqual(legacyDigest, hashBuffer);
  if (matches) {
    await upgradeLegacyPasswordHash(userId, password);
  }
  return matches;
}

async function getUserByUsername(username: string): Promise<UserRecord | null> {
  const result = await query<UserRecord>(
    `SELECT TOP 1 *
     FROM user_accounts
     WHERE username = @username`,
    { username }
  );
  return result.recordset[0] ?? null;
}

async function getUserRoles(userId: number): Promise<string[]> {
  const result = await query<RoleRecord>(
    `SELECT r.code
     FROM user_role_assignments ura
     JOIN roles r ON ura.role_id = r.role_id
     WHERE ura.user_id = @userId`,
    { userId }
  );
  return result.recordset.map((row) => row.code);
}

async function getUserPermissions(userId: number): Promise<string[]> {
  const result = await query<{ code: string }>(
    `SELECT DISTINCT p.code
     FROM user_role_assignments ura
     JOIN role_permissions rp ON ura.role_id = rp.role_id
     JOIN permissions p ON rp.permission_id = p.permission_id
     WHERE ura.user_id = @userId`,
    { userId }
  );
  return result.recordset.map((row) => row.code);
}

async function getLockout(userId: number) {
  const result = await query<{ user_id: number; locked_until: Date; failed_attempts: number }>(
    `SELECT user_id, locked_until, failed_attempts
     FROM user_session_lockouts
     WHERE user_id = @userId`,
    { userId }
  );
  return result.recordset[0] ?? null;
}

async function setLockout(userId: number, failedAttempts: number, lockMinutes?: number) {
  const now = Date.now();
  const lockDurationMs = lockMinutes
    ? lockMinutes * 60 * 1000
    : failedAttempts >= MAX_FAILED_ATTEMPTS
    ? LOCKOUT_MINUTES * 60 * 1000
    : 0;
  const lockedUntilValue =
    lockDurationMs > 0 ? new Date(now + lockDurationMs) : new Date(0);

  await query(
    `MERGE user_session_lockouts AS target
    USING (SELECT @userId AS user_id) AS src
    ON target.user_id = src.user_id
    WHEN MATCHED THEN
      UPDATE SET failed_attempts = @failedAttempts,
                 locked_until = @lockedUntil
    WHEN NOT MATCHED THEN
      INSERT (user_id, failed_attempts, locked_until)
      VALUES (@userId, @failedAttempts, @lockedUntil);`,
    {
      userId,
      failedAttempts,
      lockedUntil: lockedUntilValue,
    }
  );
}

async function clearLockout(userId: number) {
  await query(`DELETE FROM user_session_lockouts WHERE user_id = @userId`, { userId });
}

/**
 * Get managed team ID for a user (if they are a club manager)
 * Returns the first team assigned to the user via user_team_assignments
 */
async function getManagedTeamId(userId: number): Promise<number | null> {
  const result = await query<{ team_id: number }>(
    `
    SELECT TOP 1 uta.team_id
    FROM user_team_assignments uta
    WHERE uta.user_id = @userId
    ORDER BY uta.assigned_at ASC
    `,
    { userId }
  );
  return result.recordset[0]?.team_id ?? null;
}

/**
 * Get official ID for a user (if they are a match official)
 */
async function getOfficialId(userId: number): Promise<number | null> {
  const result = await query<{ official_id: number }>(
    `
    SELECT TOP 1 o.official_id
    FROM officials o
    WHERE o.user_id = @userId
    `,
    { userId }
  );
  return result.recordset[0]?.official_id ?? null;
}

export async function login(username: string, password: string) {
  const user = await getUserByUsername(username);
  if (!user) {
    throw UnauthorizedError("Invalid credentials");
  }

  if (user.status !== "active") {
    throw UnauthorizedError("Account is not active");
  }

  const lockout = await getLockout(user.user_id);
  if (lockout?.locked_until && lockout.locked_until > new Date()) {
    throw new HttpError(423, "Account is locked. Please try again later.");
  }

  const passwordMatches = await verifyPassword(password, user.password_hash, user.user_id);
  if (!passwordMatches) {
    const attempts = (lockout?.failed_attempts ?? 0) + 1;
    await setLockout(user.user_id, attempts);
    await logEvent({
      eventType: "USER_LOGIN_FAILED",
      severity: "warning",
      actorId: user.user_id,
      actorUsername: user.username,
      entityType: "USER",
      entityId: String(user.user_id),
      metadata: {
        failedAttempts: attempts,
      },
    });
    throw UnauthorizedError("Invalid credentials");
  }

  await clearLockout(user.user_id);

  await query(
    `UPDATE user_accounts
     SET last_login_at = SYSUTCDATETIME()
     WHERE user_id = @userId`,
    { userId: user.user_id }
  );

  const roles = await getUserRoles(user.user_id);
  const permissions = await getUserPermissions(user.user_id);
  const managedTeamId = await getManagedTeamId(user.user_id);
  const officialId = await getOfficialId(user.user_id);
  const teamIds = await getUserTeamIds(user.user_id);

  const payload: any = {
    sub: user.user_id,
    username: user.username,
    roles,
    permissions,
    type: "access" as const,
  };

  // Add row-level authorization fields if applicable
  if (managedTeamId) {
    payload.managed_team_id = managedTeamId;
  }
  if (officialId) {
    payload.official_id = officialId;
  }
  if (teamIds && teamIds.length > 0) {
    payload.teamIds = teamIds;
  }

  const secret: Secret = appConfig.jwt.secret;
  const options: SignOptions = {
    expiresIn: appConfig.jwt.expiresIn as SignOptions["expiresIn"],
  };
  const token = jwt.sign(payload, secret, options);

  await logEvent({
    eventType: "USER_LOGIN_SUCCESS",
    severity: "info",
    actorId: user.user_id,
    actorUsername: user.username,
    actorRole: roles[0] ?? null,
    entityType: "USER",
    entityId: String(user.user_id),
  });

  return {
    token,
    user: {
      id: user.user_id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles,
      permissions,
      lastLoginAt: new Date(),
    },
  };
}

export async function getProfile(userId: number) {
  const result = await query<UserRecord>(
    `SELECT user_id,
            username,
            email,
            first_name,
            last_name,
            status,
            last_login_at,
            must_reset_password,
            mfa_enabled
     FROM user_accounts
     WHERE user_id = @userId`,
    { userId }
  );

  const user = result.recordset[0];
  if (!user) {
    throw UnauthorizedError("User not found");
  }

  const roles = await getUserRoles(user.user_id);
  const permissions = await getUserPermissions(user.user_id);
  const managedTeamId = await getManagedTeamId(user.user_id);
  const officialId = await getOfficialId(user.user_id);
  const teamIds = await getUserTeamIds(user.user_id);

  const profile: any = {
    id: user.user_id,
    username: user.username,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    status: user.status,
    lastLoginAt: user.last_login_at,
    mustResetPassword: user.must_reset_password,
    mfaEnabled: user.mfa_enabled,
    roles,
    permissions,
  };

  if (managedTeamId) {
    profile.managed_team_id = managedTeamId;
  }
  if (officialId) {
    profile.official_id = officialId;
  }
  if (teamIds && teamIds.length > 0) {
    profile.teamIds = teamIds;
  }

  return profile;
}
