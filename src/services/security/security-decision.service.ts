import { Types } from "mongoose";
import { SecurityValidationLog } from "../../models/SecurityValidationLog";
import type { SecurityTrafficContext, SecurityValidationResult } from "./security.types";
import type { RoutingChannel } from "../../constants/routing-gateway";

export const securityDecisionService = {
  async logDecision(
    ctx: SecurityTrafficContext,
    result: SecurityValidationResult,
    extras?: {
      sessionId?: Types.ObjectId | null;
      captchaPassed?: boolean | null;
      vpnDetected?: boolean;
      proxyDetected?: boolean;
      botDetected?: boolean;
      country?: string;
      city?: string;
    }
  ): Promise<string | null> {
    try {
      const doc = await SecurityValidationLog.create({
        channel: ctx.channel as RoutingChannel,
        panelSurveyId: ctx.panelSurveyId,
        vendorId: ctx.vendorId ?? null,
        allocationId: ctx.allocationId ?? null,
        sessionId: extras?.sessionId ?? null,
        ipAddress: ctx.ipAddress,
        forwardedIp: ctx.forwardedIp,
        country: extras?.country ?? "",
        city: extras?.city ?? "",
        captchaPassed: extras?.captchaPassed ?? null,
        vpnDetected: extras?.vpnDetected ?? false,
        proxyDetected: extras?.proxyDetected ?? false,
        botDetected: extras?.botDetected ?? false,
        validationDecision: result.decision,
        blockedReason: result.allowed ? "" : result.reasonMessage.slice(0, 500),
        reasonCode: String(result.reasonCode).slice(0, 64),
        userAgent: ctx.userAgent.slice(0, 2000),
        metadata: result.metadata ?? null
      });
      return String(doc._id);
    } catch {
      return null;
    }
  }
};
