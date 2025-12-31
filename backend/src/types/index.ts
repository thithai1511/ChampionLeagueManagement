import type { Request } from "express";

export interface JwtPayload {
  sub: number;
  userId?: number; // Optional alias for sub, for backward compatibility
  username: string;
  roles: string[];
  permissions: string[];
  teamIds?: number[];
  type: "access";
  iat?: number;
  exp?: number;
}

export type AuthenticatedRequest<P = Request["params"], ResBody = any, ReqBody = any, ReqQuery = Request["query"], Locals extends Record<string, unknown> = Record<string, unknown>> = Request<P, ResBody, ReqBody, ReqQuery, Locals> & {
  user?: JwtPayload;
};

declare global {
  namespace Express {
    // Augment default Request so middleware can attach authenticated user
    // without losing type safety elsewhere.
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
