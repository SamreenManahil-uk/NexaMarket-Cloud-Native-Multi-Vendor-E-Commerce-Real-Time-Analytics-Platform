import bcrypt from "bcrypt";
import {
  createCustomer,
  createEmailVerificationToken,
  createPasswordResetToken,
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  findUserByEmail,
  findUserById,
} from "../repositories/auth.js";
import type {
  PublicUser,
  UserRecord,
} from "../types/auth.js";
import { signAccessToken } from "../utils/jwt.js";
import {
  emailConfigured,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./email.js";
import {
  createHash,
  randomBytes,
} from "node:crypto";

const BCRYPT_ROUNDS = 12;

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function publicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
    emailVerified: user.emailVerified,
    authProvider: user.authProvider,
  };
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") {
    throw new AuthError(400, "Email is required.");
  }

  const email = value.trim().toLowerCase();

  if (
    email.length < 3 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new AuthError(
      400,
      "A valid email address is required.",
    );
  }

  return email;
}

function normalizeName(
  value: unknown,
  field: "First name" | "Last name",
): string {
  if (typeof value !== "string") {
    throw new AuthError(400, `${field} is required.`);
  }

  const name = value.trim();

  if (name.length < 1 || name.length > 100) {
    throw new AuthError(
      400,
      `${field} must be between 1 and 100 characters.`,
    );
  }

  return name;
}

function validatePassword(value: unknown): string {
  if (typeof value !== "string") {
    throw new AuthError(400, "Password is required.");
  }

  if (value.length < 10 || value.length > 128) {
    throw new AuthError(
      400,
      "Password must be between 10 and 128 characters.",
    );
  }

  if (
    !/[a-z]/.test(value) ||
    !/[A-Z]/.test(value) ||
    !/[0-9]/.test(value)
  ) {
    throw new AuthError(
      400,
      "Password must include uppercase, lowercase, and a number.",
    );
  }

  return value;
}

function createToken(): {
  raw: string;
  hash: string;
} {
  const raw = randomBytes(32).toString("hex");

  return {
    raw,
    hash: hashToken(raw),
  };
}

function hashToken(token: string): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function ttlDate(
  envName: string,
  fallbackMinutes: number,
): Date {
  const configured = Number(process.env[envName]);
  const minutes =
    Number.isFinite(configured) && configured > 0
      ? configured
      : fallbackMinutes;

  return new Date(Date.now() + minutes * 60_000);
}

export async function registerCustomer(input: {
  email?: unknown;
  password?: unknown;
  firstName?: unknown;
  lastName?: unknown;
}): Promise<{
  message: string;
  verificationRequired: true;
}> {
  const email = normalizeEmail(input.email);
  const password = validatePassword(input.password);
  const firstName = normalizeName(
    input.firstName,
    "First name",
  );
  const lastName = normalizeName(
    input.lastName,
    "Last name",
  );

  const existing = await findUserByEmail(email);

  if (existing) {
    throw new AuthError(
      409,
      "An account with this email already exists.",
    );
  }

  if (!emailConfigured()) {
    throw new AuthError(
      503,
      "Email delivery is not configured.",
    );
  }

  const passwordHash = await bcrypt.hash(
    password,
    BCRYPT_ROUNDS,
  );

  let user: UserRecord;

  try {
    user = await createCustomer({
      email,
      passwordHash,
      firstName,
      lastName,
    });
  } catch (error) {
    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new AuthError(
        409,
        "An account with this email already exists.",
      );
    }

    throw error;
  }

  const token = createToken();

  await createEmailVerificationToken(
    user.id,
    token.hash,
    ttlDate("EMAIL_VERIFICATION_TTL_MINUTES", 30),
  );

  try {
    await sendVerificationEmail({
      email: user.email,
      firstName: user.firstName,
      token: token.raw,
    });
  } catch (error) {
    console.error(
      "Verification email delivery failed:",
      error,
    );

    throw new AuthError(
      503,
      "Your account was created, but the verification email could not be delivered. Please use resend verification.",
    );
  }

  return {
    message:
      "Account created. Check your email to verify your account.",
    verificationRequired: true,
  };
}

export async function login(input: {
  email?: unknown;
  password?: unknown;
}): Promise<{
  user: PublicUser;
  accessToken: string;
}> {
  const email = normalizeEmail(input.email);

  if (typeof input.password !== "string") {
    throw new AuthError(400, "Password is required.");
  }

  const user = await findUserByEmail(email);

  if (!user) {
    throw new AuthError(
      401,
      "Invalid email or password.",
    );
  }

  const validPassword = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!validPassword) {
    throw new AuthError(
      401,
      "Invalid email or password.",
    );
  }

  if (!user.emailVerified) {
    throw new AuthError(
      403,
      "Verify your email before signing in.",
    );
  }

  return {
    user: publicUser(user),
    accessToken: signAccessToken(user),
  };
}

export async function verifyEmail(
  tokenInput: unknown,
): Promise<{ message: string }> {
  if (
    typeof tokenInput !== "string" ||
    tokenInput.length < 20
  ) {
    throw new AuthError(
      400,
      "Invalid verification link.",
    );
  }

  const userId =
    await consumeEmailVerificationToken(
      hashToken(tokenInput),
    );

  if (!userId) {
    throw new AuthError(
      400,
      "This verification link is invalid or has expired.",
    );
  }

  return {
    message:
      "Your email has been verified. You can now sign in.",
  };
}

export async function resendVerification(
  emailInput: unknown,
): Promise<{ message: string }> {
  const email = normalizeEmail(emailInput);

  const generic = {
    message:
      "If an unverified account exists for this email, a verification link has been sent.",
  };

  const user = await findUserByEmail(email);

  if (!user || user.emailVerified) {
    return generic;
  }

  if (!emailConfigured()) {
    throw new AuthError(
      503,
      "Email delivery is not configured.",
    );
  }

  const token = createToken();

  await createEmailVerificationToken(
    user.id,
    token.hash,
    ttlDate("EMAIL_VERIFICATION_TTL_MINUTES", 30),
  );

  await sendVerificationEmail({
    email: user.email,
    firstName: user.firstName,
    token: token.raw,
  });

  return generic;
}

export async function forgotPassword(
  emailInput: unknown,
): Promise<{ message: string }> {
  const email = normalizeEmail(emailInput);

  const generic = {
    message:
      "If an account exists for this email, a password reset link has been sent.",
  };

  const user = await findUserByEmail(email);

  if (!user) {
    return generic;
  }

  if (!emailConfigured()) {
    throw new AuthError(
      503,
      "Email delivery is not configured.",
    );
  }

  const token = createToken();

  await createPasswordResetToken(
    user.id,
    token.hash,
    ttlDate("PASSWORD_RESET_TTL_MINUTES", 30),
  );

  await sendPasswordResetEmail({
    email: user.email,
    firstName: user.firstName,
    token: token.raw,
  });

  return generic;
}

export async function resetPassword(input: {
  token?: unknown;
  password?: unknown;
}): Promise<{ message: string }> {
  if (
    typeof input.token !== "string" ||
    input.token.length < 20
  ) {
    throw new AuthError(
      400,
      "Invalid password reset link.",
    );
  }

  const password = validatePassword(
    input.password,
  );

  const passwordHash = await bcrypt.hash(
    password,
    BCRYPT_ROUNDS,
  );

  const success =
    await consumePasswordResetToken(
      hashToken(input.token),
      passwordHash,
    );

  if (!success) {
    throw new AuthError(
      400,
      "This password reset link is invalid or has expired.",
    );
  }

  return {
    message:
      "Your password has been updated. You can now sign in.",
  };
}

export async function getPublicUserById(
  id: string,
): Promise<PublicUser | null> {
  const user = await findUserById(id);

  return user ? publicUser(user) : null;
}
