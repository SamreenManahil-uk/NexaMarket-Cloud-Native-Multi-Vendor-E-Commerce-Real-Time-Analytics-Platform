export type UserRole = "CUSTOMER" | "SELLER" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
  emailVerified: boolean;
  authProvider: "LOCAL" | "GOOGLE";
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}


export interface RegistrationResponse {
  message: string;
  verificationRequired: true;
}
