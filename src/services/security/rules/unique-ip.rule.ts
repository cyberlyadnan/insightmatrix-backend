import { gatewaySecurityConfig } from "../../../config/gateway-security.config";
import { SECURITY_REASON_CODES } from "../../../constants/gateway-security";
import { ipIntelligenceService } from "../ip-intelligence.service";
import type { SecurityRule } from "../security.types";

export const uniqueIpValidationRule: SecurityRule = {
  name: "unique_ip",
  async run(ctx) {
    const cfg = gatewaySecurityConfig.uniqueIp;
    if (!gatewaySecurityConfig.enabled || !cfg.enabled || !ctx.ipAddress) {
      return null;
    }

    const windowMinutes = cfg.windowMinutes;
    const surveyHits = await ipIntelligenceService.countRecentHits(
      ctx.ipAddress,
      { panelSurveyId: ctx.panelSurveyId },
      windowMinutes
    );

    if (cfg.blockOnDuplicate && surveyHits >= cfg.maxHitsPerSurvey) {
      return {
        allowed: false,
        decision: "block",
        reasonCode: SECURITY_REASON_CODES.DUPLICATE_IP,
        reasonMessage: `Duplicate IP for survey (${surveyHits} in ${windowMinutes}m)`,
        publicMessage:
          "This survey was recently accessed from your network. Please try again later or contact support.",
        metadata: { surveyHits, windowMinutes }
      };
    }

    if (ctx.allocationId) {
      const allocHits = await ipIntelligenceService.countRecentHits(
        ctx.ipAddress,
        { allocationId: ctx.allocationId },
        windowMinutes
      );
      if (cfg.blockOnDuplicate && allocHits >= cfg.maxHitsPerAllocation) {
        return {
          allowed: false,
          decision: "block",
          reasonCode: SECURITY_REASON_CODES.DUPLICATE_IP,
          reasonMessage: `Duplicate IP for allocation (${allocHits} in ${windowMinutes}m)`,
          publicMessage:
            "Too many attempts from your network for this survey link. Please try again later.",
          metadata: { allocHits, windowMinutes }
        };
      }
    }

    if (ctx.vendorAllowedIps?.length) {
      const allowed = ctx.vendorAllowedIps.map((x) => x.trim()).filter(Boolean);
      if (allowed.length && !allowed.includes(ctx.ipAddress)) {
        return {
          allowed: false,
          decision: "block",
          reasonCode: SECURITY_REASON_CODES.IP_BLOCKED,
          reasonMessage: "IP not in vendor allowlist",
          publicMessage: "Access from your location is not permitted for this partner.",
          metadata: {}
        };
      }
    }

    return null;
  }
};
