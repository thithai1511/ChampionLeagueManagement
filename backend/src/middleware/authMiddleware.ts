import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { appConfig } from "../config";
import { AuthenticatedRequest, JwtPayload } from "../types";
import { UnauthorizedError, ForbiddenError } from "../utils/httpError";

export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw UnauthorizedError("Authentication token is missing");
  }

  const [, token] = authHeader.split(" ");
  if (!token) {
    throw UnauthorizedError("Authentication token is invalid");
  }

  try {
    const payload = jwt.verify(token, appConfig.jwt.secret) as JwtPayload | string;
    if (typeof payload !== "object" || payload === null || !("sub" in payload)) {
      throw UnauthorizedError("Authentication token is invalid");
    }
    req.user = payload as JwtPayload;
    next();
  } catch {
    throw UnauthorizedError("Authentication token is invalid or expired");
  }
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw UnauthorizedError("Authentication required");
    }
    
    // Super admin bypasses all permission checks
    if (req.user.roles?.includes("super_admin")) {
      next();
      return;
    }
    
    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      throw ForbiddenError("You are not allowed to perform this action");
    }
    next();
  };
}

export function requireAnyPermission(...permissions: string[]) {
  const requested = permissions.filter((permission) => Boolean(permission));

  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw UnauthorizedError("Authentication required");
    }

    // Super admin bypasses all permission checks
    if (req.user.roles?.includes("super_admin")) {
      next();
      return;
    }

    if (requested.length === 0) {
      next();
      return;
    }

    const userPermissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    const hasPermission = requested.some((permission) => userPermissions.includes(permission));

    if (!hasPermission) {
      throw ForbiddenError("You are not allowed to perform this action");
    }

    next();
  };
}

/**
 * Row-level authorization: ClubManager chỉ được quản lý team của họ.
 * Expects req.params.id (team_id) or req.body.teamId to be set.
 * Global admins (manage_teams permission) bypass this check.
 */
export function requireTeamOwnership(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw UnauthorizedError("Authentication required");
  }

  // Global admins bypass ownership check
  if (req.user.permissions?.includes("manage_teams")) {
    next();
    return;
  }

  // Non-admins: must have club_manager role and managed_team_id in JWT
  const managedTeamId = (req.user as any).managed_team_id;
  const requestedTeamId = req.params.id ? parseInt(req.params.id, 10) : req.body?.teamId;

  if (!managedTeamId || requestedTeamId !== managedTeamId) {
    throw ForbiddenError("You can only manage your assigned team");
  }

  next();
}

/**
 * Row-level authorization: match_official chỉ được thao tác match được phân công.
 * Expects req.params.id (match_id) to be set.
 * Global admins (manage_matches permission) bypass this check.
 */
export function requireMatchOfficialAssignment(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw UnauthorizedError("Authentication required");
  }

  // Global admins bypass assignment check
  if (req.user.permissions?.includes("manage_matches")) {
    next();
    return;
  }

  // match_official: store officialId in JWT and verify assignment in route handler
  // For now, mark that this check should happen
  // Route handler will call a service function to verify assignment
  (req as any)._requireOfficialAssignmentCheck = true;
  next();
}