import { env } from "./env";
import { logger } from "./logger";
import nodemailer, { type Transporter } from "nodemailer";

function normalizeSmtpPass(pass: string | undefined): string {
  return (pass ?? "").replace(/\s+/g, "");
}

const smtpPort = Number(env.SMTP_PORT) || 587;
const smtpSecure = smtpPort === 465;
const smtpPass = normalizeSmtpPass(env.SMTP_PASS);

export const isSmtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && smtpPass);

export const mailTransporter: Transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || undefined,
  port: smtpPort,
  secure: smtpSecure,
  requireTLS: !smtpSecure && smtpPort === 587,
  auth: isSmtpConfigured
    ? {
        user: env.SMTP_USER,
        pass: smtpPass
      }
    : undefined,
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
  socketTimeout: 20_000,
  // Helps some providers classify traffic as authenticated SMTP submission
  name: undefined,
  tls: {
    minVersion: "TLSv1.2"
  }
});

function extractDisplayName(fromHeader?: string): string {
  if (!fromHeader?.trim()) return "InsightMatrix";
  const named = fromHeader.match(/^"?([^"<]+)"?\s*</);
  if (named?.[1]?.trim()) return named[1].trim().replace(/"/g, "");
  return "InsightMatrix";
}

/** Always send as the authenticated SMTP user (critical for SPF/DKIM alignment). */
export function getAuthenticatedMailbox(): string {
  return (env.SMTP_USER || "").trim().toLowerCase();
}

export function getMailFromAddress(): string {
  const mailbox = getAuthenticatedMailbox();
  if (!mailbox) return "InsightMatrix <no-reply@insightmatrix.local>";
  const displayName = extractDisplayName(env.SMTP_FROM);
  return `"${displayName}" <${mailbox}>`;
}

export function getMailReplyTo(): string | undefined {
  const reply = typeof env.SMTP_REPLY_TO === "string" ? env.SMTP_REPLY_TO.trim() : "";
  if (reply) return reply;
  const mailbox = getAuthenticatedMailbox();
  return mailbox || undefined;
}

export function getSenderDomain(): string {
  const mailbox = getAuthenticatedMailbox();
  const domain = mailbox.split("@")[1];
  return domain || "localhost";
}

export async function verifySmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!isSmtpConfigured) {
    return {
      ok: false,
      error: "SMTP is incomplete. Set SMTP_HOST, SMTP_USER, and SMTP_PASS (Gmail requires an App Password)."
    };
  }

  try {
    await mailTransporter.verify();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMTP verification failed";
    logger.error("SMTP verify failed", { message });
    return { ok: false, error: message };
  }
}
