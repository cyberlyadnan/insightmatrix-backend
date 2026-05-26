import { gatewaySecurityConfig } from "../../config/gateway-security.config";
import { GatewayTrafficIpRecord } from "../../models/GatewayTrafficIpRecord";
import { Types } from "mongoose";
import type { RoutingChannel } from "../../constants/routing-gateway";

export const ipIntelligenceService = {
  async recordHit(input: {
    ipAddress: string;
    forwardedIp: string;
    userAgent: string;
    country: string;
    channel: RoutingChannel;
    panelSurveyId: Types.ObjectId;
    vendorId?: Types.ObjectId | null;
    allocationId?: Types.ObjectId | null;
    sessionId?: Types.ObjectId | null;
    profileId?: Types.ObjectId | null;
  }) {
    if (!gatewaySecurityConfig.uniqueIp.enabled) return;
    await GatewayTrafficIpRecord.create({
      ipAddress: input.ipAddress,
      forwardedIp: input.forwardedIp,
      userAgent: input.userAgent.slice(0, 2000),
      country: input.country,
      channel: input.channel,
      panelSurveyId: input.panelSurveyId,
      vendorId: input.vendorId ?? null,
      allocationId: input.allocationId ?? null,
      sessionId: input.sessionId ?? null,
      profileId: input.profileId ?? null
    });
  },

  async countRecentHits(
    ipAddress: string,
    scope: { panelSurveyId?: Types.ObjectId; allocationId?: Types.ObjectId },
    windowMinutes: number
  ): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const q: Record<string, unknown> = {
      ipAddress,
      createdAt: { $gte: since }
    };
    if (scope.panelSurveyId) q.panelSurveyId = scope.panelSurveyId;
    if (scope.allocationId) q.allocationId = scope.allocationId;
    return GatewayTrafficIpRecord.countDocuments(q);
  }
};
