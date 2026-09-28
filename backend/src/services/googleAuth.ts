import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { randomBytes } from "node:crypto";

import {
  createGoogleCustomer,
  findUserByEmail,
  findUserByGoogleSub,
  linkGoogleIdentity,
} from "../repositories/auth.js";

import type {
  PublicUser,
  UserRecord,
} from "../types/auth.js";

import { signAccessToken } from "../utils/jwt.js";
import { AuthError } from "./auth.js";

const BCRYPT_ROUNDS = 12;

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

export async function googleLogin(
  credentialInput: unknown,
): Promise<{
  user: PublicUser;
  accessToken: string;
}> {
  if (
    typeof credentialInput !== "string" ||
    credentialInput.length < 50
  ) {
    throw new AuthError(
      400,
      "A valid Google credential is required.",
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();

  if (!clientId) {
    throw new AuthError(
      503,
      "Google authentication is not configured.",
    );
  }

  const client = new OAuth2Client(clientId);

  let ticket;

  try {
    ticket = await client.verifyIdToken({
      idToken: credentialInput,
      audience: clientId,
    });
  } catch {
    throw new AuthError(
      401,
      "Google authentication could not be verified.",
    );
  }

  const payload = ticket.getPayload();

  if (
    !payload?.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    throw new AuthError(
      401,
      "Google did not provide a verified email address.",
    );
  }

  const email = payload.email.trim().toLowerCase();
  const googleSub = payload.sub;

  const googleUser =
    await findUserByGoogleSub(googleSub);

  if (googleUser) {
    return {
      user: publicUser(googleUser),
      accessToken: signAccessToken(googleUser),
    };
  }

  const emailUser = await findUserByEmail(email);

  if (emailUser) {
    if (
      emailUser.googleSub &&
      emailUser.googleSub !== googleSub
    ) {
      throw new AuthError(
        409,
        "This email is already linked to another Google account.",
      );
    }

    const linked = await linkGoogleIdentity(
      emailUser.id,
      googleSub,
    );

    return {
      user: publicUser(linked),
      accessToken: signAccessToken(linked),
    };
  }

  const parts = (payload.name || "").trim().split(/\s+/);

  const firstName =
    payload.given_name?.trim() ||
    parts[0] ||
    "Google";

  const lastName =
    payload.family_name?.trim() ||
    parts.slice(1).join(" ") ||
    "User";

  const randomPassword =
    randomBytes(48).toString("hex");

  const passwordHash = await bcrypt.hash(
    randomPassword,
    BCRYPT_ROUNDS,
  );

  const user = await createGoogleCustomer({
    email,
    passwordHash,
    firstName: firstName.slice(0, 100),
    lastName: lastName.slice(0, 100),
    googleSub,
  });

  return {
    user: publicUser(user),
    accessToken: signAccessToken(user),
  };
}
