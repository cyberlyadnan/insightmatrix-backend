/** Security validation decision outcomes */
export const SECURITY_DECISIONS = ["allow", "block", "review"] as const;
export type SecurityDecision = (typeof SECURITY_DECISIONS)[number];

export const SECURITY_REASON_CODES = {
  CAPTCHA_REQUIRED: "captcha_required",
  CAPTCHA_FAILED: "captcha_failed",
  CAPTCHA_DISABLED_PASS: "captcha_disabled_pass",
  DUPLICATE_IP: "duplicate_ip",
  GEO_BLOCKED: "geo_blocked",
  GEO_VENDOR_BLOCKED: "geo_vendor_blocked",
  BOT_DETECTED: "bot_detected",
  VPN_DETECTED: "vpn_detected",
  PROXY_DETECTED: "proxy_detected",
  IP_BLOCKED: "ip_blocked",
  ALLOWED: "allowed"
} as const;

export type SecurityReasonCode = (typeof SECURITY_REASON_CODES)[keyof typeof SECURITY_REASON_CODES];
