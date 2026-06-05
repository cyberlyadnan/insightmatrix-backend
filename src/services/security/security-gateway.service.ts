import { Types } from "mongoose";
import { ApiError } from "../../utils/ApiError";
import { gatewaySecurityConfig } from "../../config/gateway-security.config";
import { captchaVerificationService } from "./captcha-verification.service";
import { geoLocationService } from "./geo-location.service";
import { proxyVpnDetectionService } from "./proxy-vpn-detection.service";
import { securityValidationPipeline } from "./security-validation-pipeline";
import { securityDecisionService } from "./security-decision.service";
import { ipIntelligenceService } from "./ip-intelligence.service";
import type { SecurityTrafficContext, SecurityValidationResult } from "./security.types";
import type { RoutingChannel } from "../../constants/routing-gateway";

export type SecurityGateOutcome = {
  allowed: boolean;
  requiresCaptcha: boolean;
  captchaSiteKey?: string;
  result: SecurityValidationResult;
  country: string;
  city: string;
};

function buildTrafficContext(input: {
  channel: RoutingChannel;
  panelSurveyId: Types.ObjectId;
  vendorId?: Types.ObjectId | null;
  allocationId?: Types.ObjectId | null;
  ipAddress: string;
  forwardedIp: string;
  userAgent: string;
  headers?: Record<string, string>;
  captchaToken?: string | null;
  survey?: Record<string, unknown>;
  vendor?: Record<string, unknown>;
}): SecurityTrafficContext {
  const survey = input.survey ?? {};
  const vendor = input.vendor ?? {};
  return {
    channel: input.channel,
    panelSurveyId: input.panelSurveyId,
    vendorId: input.vendorId ?? null,
    allocationId: input.allocationId ?? null,
    ipAddress: input.ipAddress,
    forwardedIp: input.forwardedIp,
    userAgent: input.userAgent,
    headers: input.headers,
    captchaToken: input.captchaToken,
    surveyTargetCountries: (survey.targetCountries as string[]) ?? [],
    vendorAllowedCountries: (vendor.allowedCountries as string[]) ?? [],
    vendorAllowedIps: (vendor.allowedIps as string[]) ?? []
  };
}

export const securityGatewayService = {
  isCaptchaEnabled(): boolean {
    return captchaVerificationService.isEnabled();
  },

  getCaptchaSiteKey(): string {
    return captchaVerificationService.getSiteKey();
  },

  /**
   * Central security gate — runs BEFORE session creation / supplier redirect.
   */
  async validateTraffic(input: {
    channel: RoutingChannel;
    panelSurveyId: Types.ObjectId;
    vendorId?: Types.ObjectId | null;
    allocationId?: Types.ObjectId | null;
    ipAddress: string;
    forwardedIp: string;
    userAgent: string;
    headers?: Record<string, string>;
    captchaToken?: string | null;
    survey?: Record<string, unknown>;
    vendor?: Record<string, unknown>;
  }): Promise<SecurityGateOutcome> {
    if (!gatewaySecurityConfig.enabled) {
      return {
        allowed: true,
        requiresCaptcha: false,
        country: "",
        city: "",
        result: {
          allowed: true,
          decision: "allow",
          reasonCode: "allowed",
          reasonMessage: "Security disabled",
          publicMessage: "OK"
        }
      };
    }

    const ctx = buildTrafficContext(input);

    if (captchaVerificationService.isEnabled() && !ctx.captchaToken) {
      const captchaRequired: SecurityValidationResult = {
        allowed: false,
        decision: "block",
        reasonCode: "captcha_required",
        reasonMessage: "Captcha required before session",
        publicMessage: "Please complete the security verification.",
        requiresCaptcha: true,
        metadata: { siteKey: captchaVerificationService.getSiteKey() }
      };
      await securityDecisionService.logDecision(ctx, captchaRequired, { captchaPassed: false });
      return {
        allowed: false,
        requiresCaptcha: true,
        captchaSiteKey: captchaVerificationService.getSiteKey(),
        country: "",
        city: "",
        result: captchaRequired
      };
    }

    const result = await securityValidationPipeline.run(ctx);
    const geo = await geoLocationService.lookup(ctx.ipAddress);
    const vpn = await proxyVpnDetectionService.analyze(ctx);
    const reviewSignals = (result.metadata?.reviewSignals as Array<Record<string, unknown>>) ?? [];
    const botDetected =
      result.reasonCode === "bot_detected" ||
      reviewSignals.some((s) => s.reasonCode === "bot_detected");

    await securityDecisionService.logDecision(ctx, result, {
      captchaPassed: captchaVerificationService.isEnabled()
        ? result.allowed && !result.requiresCaptcha
        : null,
      vpnDetected: vpn.vpnDetected,
      proxyDetected: vpn.proxyDetected,
      botDetected,
      country: geo.countryCode,
      city: geo.city
    });

    if (reviewSignals.length) {
      const { logGatewayEvent } = await import("../routing/routing-gateway.service");
      await logGatewayEvent({
        channel: ctx.channel,
        action: "security_review",
        success: true,
        panelSurveyId: ctx.panelSurveyId,
        vendorId: ctx.vendorId,
        allocationId: ctx.allocationId,
        sourceIp: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: {
          userType: ctx.channel === "panel" ? "internal" : "vendor",
          validationStep: "security_pipeline",
          reviewSignals
        }
      });
    }

    if (!result.allowed || result.decision === "block") {
      const { logGatewayEvent } = await import("../routing/routing-gateway.service");
      await logGatewayEvent({
        channel: ctx.channel,
        action: "validation_failed",
        success: false,
        panelSurveyId: ctx.panelSurveyId,
        vendorId: ctx.vendorId,
        allocationId: ctx.allocationId,
        sourceIp: ctx.ipAddress,
        userAgent: ctx.userAgent,
        failureReason: result.reasonMessage,
        metadata: {
          userType: ctx.channel === "panel" ? "internal" : "vendor",
          validationStep: "security_gateway",
          reasonCode: result.reasonCode,
          requiresCaptcha: Boolean(result.requiresCaptcha),
          reviewSignals
        }
      });

      return {
        allowed: false,
        requiresCaptcha: Boolean(result.requiresCaptcha),
        captchaSiteKey: captchaVerificationService.getSiteKey(),
        country: geo.countryCode,
        city: geo.city,
        result
      };
    }

    await ipIntelligenceService.recordHit({
      ipAddress: ctx.ipAddress,
      forwardedIp: ctx.forwardedIp,
      userAgent: ctx.userAgent,
      country: geo.countryCode,
      channel: ctx.channel,
      panelSurveyId: ctx.panelSurveyId,
      vendorId: ctx.vendorId,
      allocationId: ctx.allocationId
    });

    return {
      allowed: true,
      requiresCaptcha: false,
      country: geo.countryCode,
      city: geo.city,
      result
    };
  },

  /** Throws ApiError with safe public message when blocked */
  async enforceOrThrow(
    input: Parameters<typeof this.validateTraffic>[0]
  ): Promise<SecurityGateOutcome> {
    const outcome = await this.validateTraffic(input);
    if (!outcome.allowed && !outcome.requiresCaptcha) {
      throw new ApiError(403, outcome.result.publicMessage);
    }
    return outcome;
  }
};
