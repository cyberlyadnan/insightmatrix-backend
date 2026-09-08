/**
 * Transactional email templates optimized for inbox delivery.
 * Keep markup simple, text-heavy, and avoid marketing-style patterns.
 */

type BrandLayoutOptions = {
  preheader?: string;
  title: string;
  bodyHtml: string;
  footerNote?: string;
  websiteUrl?: string;
};

export type EmailContent = {
  html: string;
  text: string;
};

const BRAND = {
  primary: "#0b4fd9",
  text: "#111827",
  muted: "#4b5563",
  border: "#e5e7eb",
  bg: "#ffffff",
  soft: "#f9fafb"
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function brandLayout({
  preheader = "",
  title,
  bodyHtml,
  footerNote,
  websiteUrl
}: BrandLayoutOptions): string {
  const year = new Date().getFullYear();
  const site = websiteUrl?.replace(/\/$/, "") || "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.soft};color:${BRAND.text};-webkit-text-size-adjust:100%;">
  <span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(preheader)}
  </span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.soft};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${BRAND.bg};border:1px solid ${BRAND.border};">
          <tr>
            <td style="padding:20px 24px;border-bottom:3px solid ${BRAND.primary};">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:${BRAND.primary};letter-spacing:0.02em;">
                InsightMatrix
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text};">
              <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;font-weight:700;color:${BRAND.text};">
                ${escapeHtml(title)}
              </h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 20px;border-top:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.muted};">
              ${footerNote ? `<p style="margin:0 0 8px;">${footerNote}</p>` : ""}
              <p style="margin:0;">This message was sent by InsightMatrix regarding your account.</p>
              ${
                site
                  ? `<p style="margin:8px 0 0;"><a href="${escapeHtml(site)}" style="color:${BRAND.primary};text-decoration:none;">${escapeHtml(site)}</a></p>`
                  : ""
              }
              <p style="margin:8px 0 0;">&copy; ${year} InsightMatrix</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 12px;">
  <tr>
    <td bgcolor="${BRAND.primary}" style="border-radius:6px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.muted};word-break:break-all;">
  If the button does not work, copy and paste this link into your browser:<br />
  <a href="${escapeHtml(href)}" style="color:${BRAND.primary};">${escapeHtml(href)}</a>
</p>`;
}

function linesToText(lines: string[]): string {
  return lines.filter(Boolean).join("\n");
}

export function passwordResetEmail(opts: {
  fullName?: string;
  resetUrl: string;
  expiresMinutes: number;
  websiteUrl?: string;
}): EmailContent {
  const name = opts.fullName?.trim() || "there";
  const html = brandLayout({
    preheader: `Password reset link for your InsightMatrix account. Expires in ${opts.expiresMinutes} minutes.`,
    title: "Password reset request",
    websiteUrl: opts.websiteUrl,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 12px;">We received a request to reset the password for your InsightMatrix account.</p>
      <p style="margin:0 0 12px;">Use the secure link below to choose a new password. This link expires in <strong>${opts.expiresMinutes} minutes</strong>.</p>
      ${ctaButton(opts.resetUrl, "Reset password")}
      <p style="margin:0 0 12px;">If you did not request this change, you can ignore this email. Your password will remain unchanged.</p>
    `,
    footerNote: "For your security, never share this link with anyone."
  });

  const text = linesToText([
    "InsightMatrix — Password reset request",
    "",
    `Hi ${name},`,
    "",
    "We received a request to reset the password for your InsightMatrix account.",
    `Use this secure link within ${opts.expiresMinutes} minutes:`,
    opts.resetUrl,
    "",
    "If you did not request this change, ignore this email. Your password will remain unchanged.",
    "",
    "For your security, never share this link with anyone.",
    opts.websiteUrl ? opts.websiteUrl : "",
    "© InsightMatrix"
  ]);

  return { html, text };
}

export function emailVerificationEmail(opts: {
  fullName?: string;
  verifyUrl: string;
  expiresHours: number;
  websiteUrl?: string;
}): EmailContent {
  const name = opts.fullName?.trim() || "there";
  const html = brandLayout({
    preheader: "Confirm your email address to finish setting up your InsightMatrix account.",
    title: "Confirm your email address",
    websiteUrl: opts.websiteUrl,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 12px;">Thanks for creating an InsightMatrix account. Please confirm your email address to continue.</p>
      ${ctaButton(opts.verifyUrl, "Confirm email")}
      <p style="margin:0 0 12px;">This confirmation link expires in <strong>${opts.expiresHours} hours</strong>.</p>
    `,
    footerNote: "If you did not create this account, you can ignore this message."
  });

  const text = linesToText([
    "InsightMatrix — Confirm your email address",
    "",
    `Hi ${name},`,
    "",
    "Thanks for creating an InsightMatrix account. Confirm your email address with this link:",
    opts.verifyUrl,
    "",
    `This confirmation link expires in ${opts.expiresHours} hours.`,
    "",
    "If you did not create this account, you can ignore this message.",
    opts.websiteUrl ? opts.websiteUrl : "",
    "© InsightMatrix"
  ]);

  return { html, text };
}

export function testEmail(opts: {
  recipient: string;
  sentBy?: string;
  websiteUrl?: string;
}): EmailContent {
  const when = new Date().toUTCString();
  const html = brandLayout({
    preheader: "InsightMatrix delivery test message.",
    title: "Email delivery test",
    websiteUrl: opts.websiteUrl,
    bodyHtml: `
      <p style="margin:0 0 12px;">This is a transactional delivery test from the InsightMatrix admin console.</p>
      <p style="margin:0 0 8px;"><strong>Recipient:</strong> ${escapeHtml(opts.recipient)}</p>
      <p style="margin:0 0 8px;"><strong>Sent at (UTC):</strong> ${escapeHtml(when)}</p>
      ${
        opts.sentBy
          ? `<p style="margin:0 0 12px;"><strong>Sent by:</strong> ${escapeHtml(opts.sentBy)}</p>`
          : ""
      }
      <p style="margin:0;">If this message reached your inbox, outbound delivery is working correctly.</p>
    `,
    footerNote: "You can safely delete this test message."
  });

  const text = linesToText([
    "InsightMatrix — Email delivery test",
    "",
    "This is a transactional delivery test from the InsightMatrix admin console.",
    `Recipient: ${opts.recipient}`,
    `Sent at (UTC): ${when}`,
    opts.sentBy ? `Sent by: ${opts.sentBy}` : "",
    "",
    "If this message reached your inbox, outbound delivery is working correctly.",
    opts.websiteUrl ? opts.websiteUrl : "",
    "© InsightMatrix"
  ]);

  return { html, text };
}

/** @deprecated use passwordResetEmail */
export function passwordResetEmailHtml(opts: {
  fullName?: string;
  resetUrl: string;
  expiresMinutes: number;
  websiteUrl?: string;
}): string {
  return passwordResetEmail(opts).html;
}

/** @deprecated use emailVerificationEmail */
export function emailVerificationHtml(opts: {
  fullName?: string;
  verifyUrl: string;
  expiresHours: number;
  websiteUrl?: string;
}): string {
  return emailVerificationEmail(opts).html;
}

/** @deprecated use testEmail */
export function testEmailHtml(opts: {
  recipient: string;
  sentBy?: string;
  websiteUrl?: string;
}): string {
  return testEmail(opts).html;
}
