import { SECURITY_REASON_CODES } from "../../constants/gateway-security";
import type { SecurityTrafficContext, SecurityValidationResult } from "./security.types";
import { captchaValidationRule } from "./rules/captcha.rule";
import { uniqueIpValidationRule } from "./rules/unique-ip.rule";
import { geoValidationRule } from "./rules/geo.rule";
import { proxyVpnValidationRule } from "./rules/proxy-vpn.rule";
import { botDetectionRule } from "./rules/bot.rule";
import { toReviewOnly } from "./security-stabilization";

const RULES = [
  captchaValidationRule,
  botDetectionRule,
  uniqueIpValidationRule,
  geoValidationRule,
  proxyVpnValidationRule
];

/** Only captcha may hard-block; all other rules log warnings for analytics. */
function applyStabilization(ruleName: string, result: SecurityValidationResult): SecurityValidationResult {
  if (ruleName === "captcha") return result;
  return toReviewOnly(ruleName, result);
}

export const securityValidationPipeline = {
  async run(ctx: SecurityTrafficContext): Promise<SecurityValidationResult> {
    let geoMeta: Record<string, unknown> = {};
    const reviewSignals: Array<Record<string, unknown>> = [];

    for (const rule of RULES) {
      const raw = await rule.run(ctx);
      if (!raw) continue;

      const result = applyStabilization(rule.name, raw);

      if (rule.name === "geo" && result.metadata) {
        geoMeta = result.metadata;
      }

      if (result.decision === "review" && result.metadata?.wouldHaveBlocked) {
        reviewSignals.push({
          rule: rule.name,
          reasonCode: result.metadata.originalReasonCode ?? result.reasonCode,
          reasonMessage: result.reasonMessage
        });
      }

      if (!result.allowed || result.decision === "block") {
        return {
          ...result,
          metadata: { ...result.metadata, reviewSignals }
        };
      }

      if (result.requiresCaptcha) {
        return {
          ...result,
          metadata: { ...result.metadata, reviewSignals }
        };
      }
    }

    return {
      allowed: true,
      decision: "allow",
      reasonCode: SECURITY_REASON_CODES.ALLOWED,
      reasonMessage: "All security checks passed",
      publicMessage: "OK",
      metadata: { ...geoMeta, reviewSignals }
    };
  }
};
