import { Router } from "express";
import {
  forgotPasswordController,
  googleLoginController,
  loginController,
  meController,
  registerController,
  resendVerificationController,
  resetPasswordController,
  verifyEmailController,
} from "../controllers/auth.js";
import {
  requireAuth,
} from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post(
  "/auth/register",
  registerController,
);

authRouter.post(
  "/auth/login",
  loginController,
);


authRouter.post(
  "/auth/google",
  googleLoginController,
);

authRouter.get(
  "/auth/verify-email",
  verifyEmailController,
);

authRouter.post(
  "/auth/resend-verification",
  resendVerificationController,
);

authRouter.post(
  "/auth/forgot-password",
  forgotPasswordController,
);

authRouter.post(
  "/auth/reset-password",
  resetPasswordController,
);

authRouter.get(
  "/auth/me",
  requireAuth,
  meController,
);
