import crypto from "node:crypto";
import { env } from "../config/env";
import { logger } from "../config/logger";
import {
  getAuthenticatedMailbox,
  getMailFromAddress,
  getMailReplyTo,
  getSenderDomain,
  isSmtpConfigured,
  mailTransporter,
  verifySmtpConnection
} from "../config/mailer";
import { ApiError } from "../utils/ApiError";
import { testEmail } from "../templates/email.templates";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Used for Message-ID / logging correlation */
  category?: "password-reset" | "email-verification" | "test" | "transactional";
};

export type SendEmailResult = {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
};

function maskEmail(value?: string | null): string | null {
  if (!value) return null;
  const [local, domain] = value.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function isLocalOrPrivateUrl(url?: string | null): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    return (
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname.endsWith(".local") ||
      u.protocol !== "https:"
    );
  } catch {
    return true;
  }
}

export function getEmailDeliveryStatus() {
  const configured = isSmtpConfigured;
  const mailbox = getAuthenticatedMailbox();
  const clientLooksLocal = isLocalOrPrivateUrl(env.CLIENT_URL);

  return {
    configured,
    host: env.SMTP_HOST || null,
    port: Number(env.SMTP_PORT) || 587,
    secure: Number(env.SMTP_PORT) === 465,
    user: maskEmail(mailbox),
    from: getMailFromAddress(),
    replyTo: getMailReplyTo() || null,
    clientUrl: env.CLIENT_URL,
    apiPublicUrl: env.API_PUBLIC_URL,
    inboxTips: {
      fromAligned: Boolean(mailbox),
      clientUrlHttps: !clientLooksLocal,
      recommendation: clientLooksLocal
        ? "CLIENT_URL is localhost/http — reset links look untrusted and often land in spam. Use your real https domain in production."
        : "From address is aligned with SMTP auth. Prefer a custom domain + SPF/DKIM/DMARC for best inbox placement."
    },
    guidance: [
      "Keep SMTP_FROM display name professional, but the address must be your SMTP_USER mailbox (auto-enforced).",
      "Gmail free SMTP works for testing; for production inbox placement use a custom domain with Resend, Amazon SES, Postmark, or Google Workspace.",
      "Set CLIENT_URL and API_PUBLIC_URL to real https domains — localhost links are a common spam trigger.",
      "Ask recipients to mark one message as 'Not spam' / add the sender to contacts to train filters.",
      "Authenticate your sending domain with SPF, DKIM, and DMARC when you move off consumer Gmail."
    ]
  };
}

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  category = "transactional"
}: SendEmailInput): Promise<SendEmailResult> => {
  if (!isSmtpConfigured) {
    const message =
      "Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS on the API server.";
    logger.warn(message, { to: maskEmail(to), subject });
    throw new ApiError(503, message);
  }

  const mailbox = getAuthenticatedMailbox();
  const domain = getSenderDomain();
  const messageId = `<${crypto.randomUUID()}@${domain}>`;
  const replyTo = getMailReplyTo();

  try {
    const info = await mailTransporter.sendMail({
      from: getMailFromAddress(),
      // Envelope MAIL FROM must match authenticated identity for Gmail/provider alignment
      envelope: {
        from: mailbox,
        to
      },
      to,
      replyTo,
      subject,
      text,
      html,
      messageId,
      date: new Date(),
      headers: {
        "X-Mailer": "InsightMatrix Mailer",
        "X-Entity-Ref-ID": crypto.randomUUID(),
        "X-Auto-Response-Suppress": "All",
        "Auto-Submitted": "auto-generated",
        "X-IMX-Category": category
      },
      // Prefer listed order text then html (nodemailer builds multipart/alternative)
      alternatives: undefined
    });

    logger.info("Email sent", {
      to: maskEmail(to),
      subject,
      category,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    });

    return {
      messageId: String(info.messageId || messageId),
      accepted: (info.accepted || []).map(String),
      rejected: (info.rejected || []).map(String),
      response: String(info.response || "")
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    logger.error("Email send failed", { to: maskEmail(to), subject, category, message });
    throw new ApiError(502, `Email delivery failed: ${message}`);
  }
};

export async function getSmtpHealth() {
  const status = getEmailDeliveryStatus();
  // Cap verify so admin Email Delivery never hangs the request long enough to
  // collide with access-token refresh races in the browser.
  const verify = await Promise.race([
    verifySmtpConnection(),
    new Promise<{ ok: false; error: string }>((resolve) => {
      setTimeout(
        () =>
          resolve({
            ok: false,
            error: "SMTP verification timed out. Check host/port/firewall, then Recheck.",
          }),
        8_000
      );
    }),
  ]);
  return {
    ...status,
    verified: verify.ok,
    verifyError: verify.error || null,
  };
}

export async function sendTestEmail(to: string, sentBy?: string) {
  const health = await getSmtpHealth();
  if (!health.configured) {
    throw new ApiError(503, health.verifyError || "SMTP is not configured.");
  }
  if (!health.verified) {
    throw new ApiError(
      502,
      health.verifyError ||
        "SMTP connection failed. Check host, port, and credentials (Gmail App Password)."
    );
  }

  const content = testEmail({
    recipient: to,
    sentBy,
    websiteUrl: isLocalOrPrivateUrl(env.CLIENT_URL) ? undefined : env.CLIENT_URL
  });

  const result = await sendEmail({
    to,
    subject: "InsightMatrix email delivery test",
    html: content.html,
    text: content.text,
    category: "test"
  });

  return {
    ...result,
    to,
    smtp: {
      host: health.host,
      port: health.port,
      from: health.from,
      verified: health.verified
    }
  };
}
