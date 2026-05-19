import { ApiError } from "../../utils/ApiError";
import {
  logGatewayEvent,
  validatePanelSurveyForRouting,
  validateVendorAllocationForRouting
} from "./routing-gateway.service";
import { routingRedirectService } from "./routing-redirect.service";
import { routingSessionService } from "./routing-session.service";

export type VendorGatewayStartInput = {
  routingSlug: string;
  vendorRespondentToid?: string;
  vendorRespondentId?: string;
  trafficSource?: string;
  sourceIp?: string;
  userAgent?: string;
};

export type PanelGatewayRedirectInput = {
  surveyId: string;
  attemptToken: string;
  sourceIp?: string;
  userAgent?: string;
};

export type GatewayRedirectResult = {
  sessionToken: string;
  redirectUrl: string;
  channel: "panel" | "vendor";
  allocationCode?: string;
};

async function logValidationFailure(
  channel: "panel" | "vendor",
  err: unknown,
  meta: Record<string, unknown>
) {
  const message = err instanceof ApiError ? err.message : "Validation failed";
  await logGatewayEvent({
    channel,
    action: "validation_failed",
    success: false,
    failureReason: message,
    ...meta
  });
}

export const routingOrchestratorService = {
  async startVendorTraffic(input: VendorGatewayStartInput): Promise<GatewayRedirectResult> {
    const ctx = { sourceIp: input.sourceIp, userAgent: input.userAgent };

    try {
      const validated = await validateVendorAllocationForRouting(input.routingSlug, ctx);

      const session = await routingSessionService.createVendorRespondentSession(validated, {
        vendorRespondentToid: input.vendorRespondentToid ?? input.vendorRespondentId,
        trafficSource: input.trafficSource,
        sourceIp: input.sourceIp,
        userAgent: input.userAgent
      });

      const redirectUrl = routingRedirectService.buildSupplierRedirectUrl(
        validated.externalSurveyUrl,
        validated.trackingParameterName,
        session.internalSessionToken
      );

      await routingSessionService.markVendorSessionRedirected(
        session.sessionId,
        session.allocationId
      );

      await logGatewayEvent({
        channel: "vendor",
        action: "redirect_success",
        success: true,
        panelSurveyId: validated.surveyId,
        vendorId: validated.vendorId,
        allocationId: validated.allocationId,
        sessionToken: session.internalSessionToken,
        sourceIp: input.sourceIp,
        userAgent: input.userAgent,
        metadata: {
          allocationCode: validated.allocationCode,
          vendorRespondentToid: session.vendorRespondentToid
        }
      });

      return {
        sessionToken: session.internalSessionToken,
        redirectUrl,
        channel: "vendor",
        allocationCode: validated.allocationCode
      };
    } catch (err) {
      await logValidationFailure("vendor", err, {
        sourceIp: input.sourceIp,
        userAgent: input.userAgent,
        metadata: { routingSlug: input.routingSlug }
      });
      throw err;
    }
  },

  async resolvePanelRedirect(input: PanelGatewayRedirectInput): Promise<GatewayRedirectResult> {
    const ctx = { sourceIp: input.sourceIp, userAgent: input.userAgent };

    try {
      const validated = await validatePanelSurveyForRouting(input.surveyId, ctx);

      const session = await routingSessionService.resolvePanelAttemptByToken(
        validated,
        input.attemptToken
      );

      const redirectUrl = routingRedirectService.buildSupplierRedirectUrl(
        validated.externalSurveyUrl,
        validated.trackingParameterName,
        session.sessionToken
      );

      await logGatewayEvent({
        channel: "panel",
        action: "redirect_success",
        success: true,
        panelSurveyId: validated.surveyId,
        sessionToken: session.sessionToken,
        sourceIp: input.sourceIp,
        userAgent: input.userAgent
      });

      return {
        sessionToken: session.sessionToken,
        redirectUrl,
        channel: "panel"
      };
    } catch (err) {
      await logValidationFailure("panel", err, {
        panelSurveyId: input.surveyId,
        sessionToken: input.attemptToken,
        sourceIp: input.sourceIp,
        userAgent: input.userAgent
      });
      throw err;
    }
  }
};
