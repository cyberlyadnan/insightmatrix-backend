import {
  logGatewayEvent,
  validatePanelSurveyForRouting,
  validateVendorAllocationForRouting
} from "./routing-gateway.service";
import { routingRedirectService } from "./routing-redirect.service";
import { routingSessionService } from "./routing-session.service";
import { getUniversalRoutingPrescreenForm } from "../prescreen/universal-prescreen.service";
import { surveyRespondentProfileService } from "../survey-respondent-profile/survey-respondent-profile.service";
import { toPrescreenDto } from "../../utils/prescreen.dto";
import { securityGatewayService } from "../security/security-gateway.service";
import { ApiError } from "../../utils/ApiError";
import { extractObjectIdString } from "../../utils/object-id";

export type VendorGatewayStartInput = {
  routingSlug: string;
  vendorRespondentToid?: string;
  vendorRespondentId?: string;
  trafficSource?: string;
  sourceIp?: string;
  forwardedIp?: string;
  userAgent?: string;
  headers?: Record<string, string>;
  captchaToken?: string | null;
};

export type PanelGatewayRedirectInput = {
  surveyId: string;
  attemptToken: string;
  sourceIp?: string;
  forwardedIp?: string;
  userAgent?: string;
  headers?: Record<string, string>;
  captchaToken?: string | null;
};

export type GatewayRedirectResult = {
  sessionToken: string;
  redirectUrl?: string;
  channel: "panel" | "vendor";
  allocationCode?: string;
  requiresPrescreen?: boolean;
  requiresCaptcha?: boolean;
  captchaSiteKey?: string;
  profileId?: string;
  prescreenForm?: ReturnType<typeof toPrescreenDto> | null;
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

async function buildPrescreenGateResponse(
  channel: "panel" | "vendor",
  sessionToken: string,
  profileId: string,
  extra?: Partial<GatewayRedirectResult>
): Promise<GatewayRedirectResult> {
  const prescreen = await getUniversalRoutingPrescreenForm();
  if (!prescreen.configured) {
    return {
      sessionToken,
      channel,
      requiresPrescreen: false,
      profileId,
      ...extra
    };
  }
  return {
    sessionToken,
    channel,
    requiresPrescreen: true,
    profileId,
    prescreenForm: prescreen.formDto,
    ...extra
  };
}

export const routingOrchestratorService = {
  async startVendorTraffic(input: VendorGatewayStartInput): Promise<GatewayRedirectResult> {
    const ctx = { sourceIp: input.sourceIp, userAgent: input.userAgent };

    try {
      const validated = await validateVendorAllocationForRouting(input.routingSlug, ctx);

      const security = await securityGatewayService.validateTraffic({
        channel: "vendor",
        panelSurveyId: validated.surveyId,
        vendorId: validated.vendorId,
        allocationId: validated.allocationId,
        ipAddress: input.sourceIp ?? "",
        forwardedIp: input.forwardedIp ?? "",
        userAgent: input.userAgent ?? "",
        headers: input.headers,
        captchaToken: input.captchaToken,
        survey: validated.survey,
        vendor: validated.vendor
      });

      if (security.requiresCaptcha) {
        await logGatewayEvent({
          channel: "vendor",
          action: "security_captcha_required",
          success: true,
          panelSurveyId: validated.surveyId,
          vendorId: validated.vendorId,
          allocationId: validated.allocationId,
          metadata: { security: "captcha_required" }
        });
        return {
          sessionToken: "",
          channel: "vendor",
          requiresCaptcha: true,
          captchaSiteKey: security.captchaSiteKey,
          allocationCode: validated.allocationCode
        };
      }

      if (!security.allowed) {
        throw new ApiError(403, security.result.publicMessage);
      }

      const session = await routingSessionService.createVendorRespondentSession(validated, {
        vendorRespondentToid: input.vendorRespondentToid ?? input.vendorRespondentId,
        trafficSource: input.trafficSource,
        sourceIp: input.sourceIp,
        userAgent: input.userAgent
      });

      const profile = await surveyRespondentProfileService.createForVendorSession({
        panelSurveyId: validated.surveyId,
        allocationId: validated.allocationId,
        vendorId: validated.vendorId,
        vendorRespondentSessionId: session.sessionId,
        vendorRespondentToid: session.vendorRespondentToid,
        internalSessionToken: session.internalSessionToken,
        trafficSource: input.trafficSource,
        sourceIp: input.sourceIp
      });

      const prescreen = await getUniversalRoutingPrescreenForm();
      if (prescreen.configured) {
        await logGatewayEvent({
          channel: "vendor",
          action: "prescreen_required",
          success: true,
          panelSurveyId: validated.surveyId,
          vendorId: validated.vendorId,
          allocationId: validated.allocationId,
          sessionToken: session.internalSessionToken,
          metadata: { profileId: String(profile._id) }
        });

        return buildPrescreenGateResponse("vendor", session.internalSessionToken, String(profile._id), {
          allocationCode: validated.allocationCode
        });
      }

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
        requiresPrescreen: false,
        profileId: String(profile._id),
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

  async completePrescreenAndRedirect(input: {
    profileId: string;
    internalSessionToken: string;
    answers: Record<string, unknown>;
    durationMs?: number | null;
    channel: "panel" | "vendor";
    sourceIp?: string;
    userAgent?: string;
  }): Promise<GatewayRedirectResult> {
    const { profile: saved } = await surveyRespondentProfileService.savePrescreenAndAdvance({
      profileId: input.profileId,
      internalSessionToken: input.internalSessionToken,
      answers: input.answers,
      durationMs: input.durationMs
    });

    const profile = saved as Record<string, unknown>;
    const token = String(profile.internalSessionToken ?? input.internalSessionToken);

    if (input.channel === "vendor") {
      const { vendorAllocationRepository } = await import(
        "../../repositories/vendor-allocation.repository"
      );
      const { validateVendorAllocationForRouting } = await import("./routing-gateway.service");

      const allocationId = extractObjectIdString(profile.allocationId);
      if (!allocationId) throw new ApiError(404, "Allocation not found");
      const alloc = await vendorAllocationRepository.findById(allocationId);
      if (!alloc) throw new ApiError(404, "Allocation not found");

      const routingSlug = String(alloc.routingSlug ?? "");
      const validated = await validateVendorAllocationForRouting(routingSlug, {
        sourceIp: input.sourceIp,
        userAgent: input.userAgent
      });

      const session = await routingSessionService.resolveByParticipantRef(token);
      if (!session || session.type !== "vendor") {
        throw new ApiError(404, "Vendor session not found");
      }

      const redirectUrl = routingRedirectService.buildSupplierRedirectUrl(
        validated.externalSurveyUrl,
        validated.trackingParameterName,
        token
      );

      await routingSessionService.markVendorSessionRedirected(
        session.sessionId,
        session.allocationId
      );

      const { surveyRespondentProfileRepository } = await import(
        "../../repositories/survey-respondent-profile.repository"
      );
      const { Types } = await import("mongoose");
      await surveyRespondentProfileRepository.appendLifecycle(
        new Types.ObjectId(input.profileId),
        "redirected",
        { note: "Redirected to supplier after prescreen" }
      );

      await logGatewayEvent({
        channel: "vendor",
        action: "redirect_success",
        success: true,
        panelSurveyId: validated.surveyId,
        vendorId: validated.vendorId,
        allocationId: validated.allocationId,
        sessionToken: token,
        metadata: { afterPrescreen: true }
      });

      return {
        sessionToken: token,
        redirectUrl,
        channel: "vendor",
        requiresPrescreen: false,
        profileId: input.profileId
      };
    }

    const panelSurveyId = extractObjectIdString(profile.panelSurveyId);
    if (!panelSurveyId) throw new ApiError(404, "Survey not found for profile");
    const { validatePanelSurveyForRouting } = await import("./routing-gateway.service");
    const validated = await validatePanelSurveyForRouting(panelSurveyId, {
      sourceIp: input.sourceIp,
      userAgent: input.userAgent
    });

    const panelCtx = await routingSessionService.resolvePanelAttemptByToken(validated, token);
    const redirectUrl = routingRedirectService.buildSupplierRedirectUrl(
      validated.externalSurveyUrl,
      validated.trackingParameterName,
      panelCtx.sessionToken
    );

    const { surveyRespondentProfileRepository } = await import(
      "../../repositories/survey-respondent-profile.repository"
    );
    const { Types } = await import("mongoose");
    await surveyRespondentProfileRepository.appendLifecycle(
      new Types.ObjectId(input.profileId),
      "redirected",
      { note: "Panel redirected after prescreen" }
    );

    return {
      sessionToken: token,
      redirectUrl,
      channel: "panel",
      requiresPrescreen: false,
      profileId: input.profileId
    };
  },

  async resolvePanelRedirect(input: PanelGatewayRedirectInput): Promise<GatewayRedirectResult> {
    const ctx = { sourceIp: input.sourceIp, userAgent: input.userAgent };

    try {
      const validated = await validatePanelSurveyForRouting(input.surveyId, ctx);

      const session = await routingSessionService.resolvePanelAttemptByToken(
        validated,
        input.attemptToken
      );

      const security = await securityGatewayService.validateTraffic({
        channel: "panel",
        panelSurveyId: validated.surveyId,
        ipAddress: input.sourceIp ?? "",
        forwardedIp: input.forwardedIp ?? "",
        userAgent: input.userAgent ?? "",
        headers: input.headers,
        captchaToken: input.captchaToken,
        survey: validated.survey
      });

      if (security.requiresCaptcha) {
        return {
          sessionToken: session.sessionToken,
          channel: "panel",
          requiresCaptcha: true,
          captchaSiteKey: security.captchaSiteKey
        };
      }

      if (!security.allowed) {
        throw new ApiError(403, security.result.publicMessage);
      }

      const profile = await surveyRespondentProfileService.createForPanelAttempt({
        panelSurveyId: validated.surveyId,
        panelSurveyAttemptId: session.attemptId,
        userId: session.userId,
        internalSessionToken: session.sessionToken
      });

      const prescreen = await getUniversalRoutingPrescreenForm();
      if (prescreen.configured && !profile.prescreenCompletedAt) {
        return buildPrescreenGateResponse("panel", session.sessionToken, String(profile._id));
      }

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
        channel: "panel",
        requiresPrescreen: false,
        profileId: String(profile._id)
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
