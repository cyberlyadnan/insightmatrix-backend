import { gatewaySecurityConfig } from "../../config/gateway-security.config";
import { SECURITY_REASON_CODES } from "../../constants/gateway-security";
import type { SecurityValidationResult } from "./security.types";

type RecaptchaVerifyResponse = {
  success: boolean;
  score?: number;
  "error-codes"?: string[];
  action?: string;
};

async function verifyWithGoogle(
  secret: string,
  token: string,
  remoteip?: string
): Promise<RecaptchaVerifyResponse> {
  const params = new URLSearchParams({
    secret,
    response: token
  });
  if (remoteip) params.set("remoteip", remoteip);

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  return (await res.json()) as RecaptchaVerifyResponse;
}

export const captchaVerificationService = {
  isEnabled(): boolean {
    return (
      gatewaySecurityConfig.enabled &&
      gatewaySecurityConfig.captcha.enabled &&
      Boolean(gatewaySecurityConfig.captcha.secretKey && gatewaySecurityConfig.captcha.siteKey)
    );
  },

  getSiteKey(): string {
    return gatewaySecurityConfig.captcha.siteKey;
  },

  async verifyToken(
    token: string | null | undefined,
    remoteIp?: string
  ): Promise<SecurityValidationResult> {
    if (!this.isEnabled()) {
      return {
        allowed: true,
        decision: "allow",
        reasonCode: SECURITY_REASON_CODES.CAPTCHA_DISABLED_PASS,
        reasonMessage: "Captcha disabled",
        publicMessage: "OK"
      };
    }

    const trimmed = String(token ?? "").trim();
    if (!trimmed) {
      return {
        allowed: false,
        decision: "block",
        reasonCode: SECURITY_REASON_CODES.CAPTCHA_REQUIRED,
        reasonMessage: "Captcha token missing",
        publicMessage: "Please complete the security verification to continue.",
        requiresCaptcha: true,
        metadata: { siteKey: gatewaySecurityConfig.captcha.siteKey }
      };
    }

    const verify = await verifyWithGoogle(
      gatewaySecurityConfig.captcha.secretKey,
      trimmed,
      remoteIp
    );

    if (!verify.success) {
      return {
        allowed: false,
        decision: "block",
        reasonCode: SECURITY_REASON_CODES.CAPTCHA_FAILED,
        reasonMessage: `Captcha failed: ${(verify["error-codes"] ?? []).join(", ")}`,
        publicMessage: "Security verification failed. Please try again.",
        requiresCaptcha: true
      };
    }

    if (
      gatewaySecurityConfig.captcha.provider === "recaptcha_v3" &&
      typeof verify.score === "number" &&
      verify.score < gatewaySecurityConfig.captcha.minScore
    ) {
      return {
        allowed: false,
        decision: "block",
        reasonCode: SECURITY_REASON_CODES.CAPTCHA_FAILED,
        reasonMessage: `Captcha score too low: ${verify.score}`,
        publicMessage: "We could not verify you as human. Please try again.",
        requiresCaptcha: true,
        metadata: { score: verify.score }
      };
    }

    return {
      allowed: true,
      decision: "allow",
      reasonCode: SECURITY_REASON_CODES.ALLOWED,
      reasonMessage: "Captcha passed",
      publicMessage: "OK",
      metadata: { score: verify.score }
    };
  }
};
