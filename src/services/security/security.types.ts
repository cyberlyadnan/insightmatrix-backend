import type { Types } from "mongoose";
import type { SecurityDecision, SecurityReasonCode } from "../../constants/gateway-security";
import type { RoutingChannel } from "../../constants/routing-gateway";

export type SecurityValidationResult = {
  allowed: boolean;
  decision: SecurityDecision;
  reasonCode: SecurityReasonCode | string;
  reasonMessage: string;
  /** Safe message for end users — never expose internal details */
  publicMessage: string;
  requiresCaptcha?: boolean;
  metadata?: Record<string, unknown>;
};

export type SecurityTrafficContext = {
  channel: RoutingChannel;
  panelSurveyId: Types.ObjectId;
  vendorId?: Types.ObjectId | null;
  allocationId?: Types.ObjectId | null;
  ipAddress: string;
  forwardedIp: string;
  userAgent: string;
  headers?: Record<string, string>;
  captchaToken?: string | null;
  surveyTargetCountries?: string[];
  vendorAllowedCountries?: string[];
  vendorAllowedIps?: string[];
};

export type SecurityRule = {
  name: string;
  run(ctx: SecurityTrafficContext): Promise<SecurityValidationResult | null>;
};
