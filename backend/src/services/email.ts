import nodemailer from "nodemailer";

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function frontendUrl(): string {
  return (
    process.env.FRONTEND_URL?.trim() ||
    "http://localhost:5175"
  ).replace(/\/$/, "");
}

function transporter() {
  const port = Number(process.env.SMTP_PORT || "587");

  return nodemailer.createTransport({
    host: required("SMTP_HOST"),
    port,
    secure:
      (process.env.SMTP_SECURE || "false")
        .toLowerCase() === "true",
    auth: {
      user: required("SMTP_USER"),
      pass: required("SMTP_PASS"),
    },
  });
}

export function emailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS,
  );
}

export async function verifyEmailTransport(): Promise<void> {
  await transporter().verify();
}

export async function sendVerificationEmail(input: {
  email: string;
  firstName: string;
  token: string;
}): Promise<void> {
  const url =
    `${frontendUrl()}/verify-email?token=` +
    encodeURIComponent(input.token);

  await transporter().sendMail({
    from:
      process.env.SMTP_FROM ||
      "NexaMarket <no-reply@nexamarket.local>",
    to: input.email,
    subject: "Verify your NexaMarket email",
    text:
      `Hi ${input.firstName},\n\n` +
      `Verify your NexaMarket account using this link:\n${url}\n\n` +
      `This link expires shortly. If you did not create this account, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#173c30">
        <h1 style="font-size:28px">NexaMarket.</h1>
        <h2>Verify your email</h2>
        <p>Hi ${escapeHtml(input.firstName)},</p>
        <p>Confirm your email address to activate your NexaMarket account.</p>
        <p style="margin:28px 0">
          <a href="${url}"
             style="background:#173f32;color:white;text-decoration:none;padding:13px 22px;border-radius:999px">
            Verify email
          </a>
        </p>
        <p style="font-size:12px;color:#66756e">
          This verification link expires shortly.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(input: {
  email: string;
  firstName: string;
  token: string;
}): Promise<void> {
  const url =
    `${frontendUrl()}/reset-password?token=` +
    encodeURIComponent(input.token);

  await transporter().sendMail({
    from:
      process.env.SMTP_FROM ||
      "NexaMarket <no-reply@nexamarket.local>",
    to: input.email,
    subject: "Reset your NexaMarket password",
    text:
      `Hi ${input.firstName},\n\n` +
      `Reset your NexaMarket password using this link:\n${url}\n\n` +
      `If you did not request a password reset, ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#173c30">
        <h1 style="font-size:28px">NexaMarket.</h1>
        <h2>Reset your password</h2>
        <p>Hi ${escapeHtml(input.firstName)},</p>
        <p>We received a request to reset your NexaMarket password.</p>
        <p style="margin:28px 0">
          <a href="${url}"
             style="background:#173f32;color:white;text-decoration:none;padding:13px 22px;border-radius:999px">
            Reset password
          </a>
        </p>
        <p style="font-size:12px;color:#66756e">
          If you did not request this, you can safely ignore the email.
        </p>
      </div>
    `,
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
