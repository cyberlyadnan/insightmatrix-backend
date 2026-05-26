import { SECURITY_REASON_CODES } from "../../constants/gateway-security";
import type { SecurityTrafficContext, SecurityValidationResult } from "./security.types";
import { captchaValidationRule } from "./rules/captcha.rule";
import { uniqueIpValidationRule } from "./rules/unique-ip.rule";
import { geoValidationRule } from "./rules/geo.rule";
import { proxyVpnValidationRule } from "./rules/proxy-vpn.rule";
import { botDetectionRule } from "./rules/bot.rule";

const RULES = [
  captchaValidationRule,
  botDetectionRule,
  uniqueIpValidationRule,
  geoValidationRule,
  proxyVpnValidationRule
];

export const securityValidationPipeline = {
  async run(ctx: SecurityTrafficContext): Promise<SecurityValidationResult> {
    let geoMeta: Record<string, unknown> = {};

    for (const rule of RULES) {
      const result = await rule.run(ctx);
      if (!result) continue;

      if (rule.name === "geo" && result.metadata) {
        geoMeta = result.metadata;
      }

      if (!result.allowed || result.decision === "block") {
        return result;
      }

      if (result.requiresCaptcha) {
        return result;
      }
    }

    return {
      allowed: true,
      decision: "allow",
      reasonCode: SECURITY_REASON_CODES.ALLOWED,
      reasonMessage: "All security checks passed",
      publicMessage: "OK",
      metadata: geoMeta
    };
  }
};
