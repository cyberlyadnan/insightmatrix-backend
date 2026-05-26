import { captchaVerificationService } from "../captcha-verification.service";
import type { SecurityRule } from "../security.types";

export const captchaValidationRule: SecurityRule = {
  name: "captcha",
  async run(ctx) {
    if (!captchaVerificationService.isEnabled()) return null;
    return captchaVerificationService.verifyToken(ctx.captchaToken, ctx.ipAddress);
  }
};
