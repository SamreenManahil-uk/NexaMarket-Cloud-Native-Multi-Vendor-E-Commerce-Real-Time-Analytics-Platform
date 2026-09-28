import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../config/env.js";
import type { JwtPayload, UserRecord } from "../types/auth.js";

export function signAccessToken(user: UserRecord): string {
  const options: SignOptions = {
    expiresIn: config.auth.jwtExpiresIn as SignOptions["expiresIn"],
  };

  return jwt.sign(
    {
      email: user.email,
      role: user.role,
    },
    config.auth.jwtSecret,
    {
      ...options,
      subject: user.id,
    },
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.auth.jwtSecret);

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    typeof decoded.email !== "string" ||
    (decoded.role !== "CUSTOMER" &&
      decoded.role !== "SELLER" &&
      decoded.role !== "ADMIN")
  ) {
    throw new Error("Invalid token payload.");
  }

  return {
    sub: decoded.sub,
    email: decoded.email,
    role: decoded.role,
  };
}
