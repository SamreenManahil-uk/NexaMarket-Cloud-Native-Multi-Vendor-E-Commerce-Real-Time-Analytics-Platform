import type { NextFunction, Request, Response } from "express";
import type { JwtPayload, UserRole } from "../types/auth.js";
import { verifyAccessToken } from "../utils/jwt.js";

export interface AuthenticatedRequest extends Request {
  auth?: JwtPayload;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    req.auth = verifyAccessToken(token);
    console.log(
      "[AUTH DEBUG] requireAuth:",
      req.auth ? { sub: req.auth.sub, role: req.auth.role } : "NO AUTH",
    );
    next();
  } catch (error) {
    console.error("[AUTH DEBUG] verify failed:", error);
    res.status(401).json({ error: "Invalid or expired access token." });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    console.log(
      "[AUTH DEBUG] requireRole:",
      req.auth ? { sub: req.auth.sub, role: req.auth.role } : "NO AUTH",
      "allowed=",
      roles,
    );

    if (!req.auth) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ error: "Forbidden." });
      return;
    }

    next();
  };
}
