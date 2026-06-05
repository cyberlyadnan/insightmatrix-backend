import { gatewaySecurityConfig } from "../../config/gateway-security.config";
import { SECURITY_REASON_CODES } from "../../constants/gateway-security";
import type { SecurityTrafficContext, SecurityValidationResult } from "./security.types";

const BOT_UA_PATTERNS = [
  /headless/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /go-http-client/i,
  /scrapy/i,
  /bot\b/i,
  /spider/i,
  /crawler/i
];

const MIN_UA_LENGTH = 12;

/** Browsers use text/html on navigation; our gateway uses fetch with application/json. */
function hasLegitimateAcceptHeader(accept: string): boolean {
  const value = accept.toLowerCase();
  if (!value) return false;
  return (
    value.includes("text/html") ||
    value.includes("*/*") ||
    value.includes("application/json")
  );
}

export const botDetectionService = {
  analyze(ctx: SecurityTrafficContext): SecurityValidationResult {
    if (!gatewaySecurityConfig.enabled || !gatewaySecurityConfig.bot.enabled) {
      return {
        allowed: true,
        decision: "allow",
        reasonCode: SECURITY_REASON_CODES.ALLOWED,
        reasonMessage: "Bot check disabled",
        publicMessage: "OK"
      };
    }

    const ua = String(ctx.userAgent ?? "").trim();
    const headers = ctx.headers ?? {};

    let suspicious = false;
    let detail = "";

    if (!ua || ua.length < MIN_UA_LENGTH) {
      suspicious = true;
      detail = "missing_or_short_user_agent";
    }

    for (const pattern of BOT_UA_PATTERNS) {
      if (pattern.test(ua)) {
        suspicious = true;
        detail = "suspicious_user_agent";
        break;
      }
    }

    const accept = String(headers.accept ?? headers.Accept ?? "");
    const acceptLang = String(headers["accept-language"] ?? headers["Accept-Language"] ?? "");
    if (!suspicious && ua && !hasLegitimateAcceptHeader(accept)) {
      suspicious = true;
      detail = "missing_accept_header";
    }
    if (!suspicious && ua && !acceptLang && !/curl|wget|python/i.test(ua)) {
      suspicious = true;
      detail = "missing_accept_language";
    }

    if (suspicious) {
      return {
        allowed: false,
        decision: "block",
        reasonCode: SECURITY_REASON_CODES.BOT_DETECTED,
        reasonMessage: detail,
        publicMessage:
          "Your browser could not be verified for this survey. Please use a standard web browser.",
        metadata: { detail, suspicious: true }
      };
    }

    return {
      allowed: true,
      decision: "allow",
      reasonCode: SECURITY_REASON_CODES.ALLOWED,
      reasonMessage: "OK",
      publicMessage: "OK",
      metadata: { suspicious: false, detail }
    };
  }
};
