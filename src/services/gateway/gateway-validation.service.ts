import type {
  GatewayValidationContext,
  GatewayValidationResult,
  IGatewayValidationService
} from "./gateway-validation.types";

/**
 * Placeholder gateway verification service.
 * All checks pass-through until routing expansion (later prompts).
 */
function passThrough(_ctx: GatewayValidationContext): GatewayValidationResult {
  return {
    allowed: true,
    score: 0,
    failedChecks: [],
    reasons: [],
    metadata: { stub: true, phase: "foundation" }
  };
}

export class GatewayValidationService implements IGatewayValidationService {
  async validateSession(ctx: GatewayValidationContext): Promise<GatewayValidationResult> {
    return passThrough(ctx);
  }

  async validateIp(ctx: GatewayValidationContext): Promise<GatewayValidationResult> {
    return passThrough(ctx);
  }

  async validateCountry(ctx: GatewayValidationContext): Promise<GatewayValidationResult> {
    return passThrough(ctx);
  }

  async detectVpn(ctx: GatewayValidationContext): Promise<GatewayValidationResult> {
    return passThrough(ctx);
  }

  async detectDuplicate(ctx: GatewayValidationContext): Promise<GatewayValidationResult> {
    return passThrough(ctx);
  }

  async validateFingerprint(ctx: GatewayValidationContext): Promise<GatewayValidationResult> {
    return passThrough(ctx);
  }

  async scoreFraud(ctx: GatewayValidationContext): Promise<GatewayValidationResult> {
    return passThrough(ctx);
  }
}

/** Singleton for future injection into survey start / vendor routing flows */
export const gatewayValidationService = new GatewayValidationService();
