import type {
  NextFunction,
  Request,
  Response,
} from "express";
import type {
  AuthenticatedRequest,
} from "../middleware/auth.js";
import { googleLogin } from "../services/googleAuth.js";
import {
  AuthError,
  forgotPassword,
  getPublicUserById,
  login,
  registerCustomer,
  resendVerification,
  resetPassword,
  verifyEmail,
} from "../services/auth.js";

function handleAuthError(
  error: unknown,
  next: NextFunction,
): void {
  if (error instanceof AuthError) {
    next(error);
    return;
  }

  next(error);
}

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result =
      await registerCustomer(req.body ?? {});

    res.status(201).json(result);
  } catch (error) {
    handleAuthError(error, next);
  }
}

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await login(req.body ?? {});
    res.status(200).json(result);
  } catch (error) {
    handleAuthError(error, next);
  }
}

export async function verifyEmailController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await verifyEmail(
      req.query.token,
    );

    res.status(200).json(result);
  } catch (error) {
    handleAuthError(error, next);
  }
}

export async function resendVerificationController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result =
      await resendVerification(req.body?.email);

    res.status(200).json(result);
  } catch (error) {
    handleAuthError(error, next);
  }
}

export async function forgotPasswordController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result =
      await forgotPassword(req.body?.email);

    res.status(200).json(result);
  } catch (error) {
    handleAuthError(error, next);
  }
}

export async function resetPasswordController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result =
      await resetPassword(req.body ?? {});

    res.status(200).json(result);
  } catch (error) {
    handleAuthError(error, next);
  }
}

export async function meController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({
        error: "Authentication required.",
      });
      return;
    }

    const user =
      await getPublicUserById(req.auth.sub);

    if (!user) {
      res.status(401).json({
        error:
          "Authenticated user no longer exists.",
      });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}


export async function googleLoginController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await googleLogin(
      req.body?.credential,
    );

    res.status(200).json(result);
  } catch (error) {
    handleAuthError(error, next);
  }
}
