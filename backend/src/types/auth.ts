export type UserRole = "CUSTOMER" | "SELLER" | "ADMIN";
export type AuthProvider = "LOCAL" | "GOOGLE";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  googleSub: string | null;
  authProvider: AuthProvider;
}

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
  emailVerified: boolean;
  authProvider: AuthProvider;
}


export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
