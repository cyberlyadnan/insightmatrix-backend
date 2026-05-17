/**
 * Future gateway verification layer — types only (Prompt 1).
 * Will validate traffic before panel/survey start redirects.
 */

export type GatewayValidationContext = {
  surveyId?: string;
  panelSurveyId?: string;
  vendorId?: string;
  assignmentId?: string;
  participantRef?: string;
  ipAddress?: string;
  countryCode?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  headers?: Record<string, string>;
};

export type GatewayValidationCheck =
  | "ip"
  | "country"
  | "vpn"
  | "duplicate"
  | "fingerprint"
  | "device"
  | "fraud_score";

export type GatewayValidationResult = {
  allowed: boolean;
  score: number;
  failedChecks: GatewayValidationCheck[];
  reasons: string[];
  metadata?: Record<string, unknown>;
};

export interface IGatewayValidationService {
  validateSession(ctx: GatewayValidationContext): Promise<GatewayValidationResult>;
  validateIp(ctx: GatewayValidationContext): Promise<GatewayValidationResult>;
  validateCountry(ctx: GatewayValidationContext): Promise<GatewayValidationResult>;
  detectVpn(ctx: GatewayValidationContext): Promise<GatewayValidationResult>;
  detectDuplicate(ctx: GatewayValidationContext): Promise<GatewayValidationResult>;
  validateFingerprint(ctx: GatewayValidationContext): Promise<GatewayValidationResult>;
  scoreFraud(ctx: GatewayValidationContext): Promise<GatewayValidationResult>;
}
