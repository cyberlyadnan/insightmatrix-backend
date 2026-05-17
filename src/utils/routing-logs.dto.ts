import type { VendorCallbackOutcome } from "../constants/vendor-callback";
import type { WebhookDeliveryStatus } from "../constants/routing-gateway";
import type { GatewayRoutingAction, RoutingChannel } from "../constants/routing-gateway";

export type WebhookDeliveryLogDto = {
  id: string;
  vendorId: string;
  vendorCode: string | null;
  vendorCompanyName: string | null;
  panelSurveyId: string;
  surveyName: string | null;
  surveyCode: string | null;
  allocationId: string | null;
  sessionId: string | null;
  callbackType: VendorCallbackOutcome;
  destinationUrl: string;
  responseStatus: number | null;
  deliveryStatus: WebhookDeliveryStatus;
  errorMessage: string;
  attemptedAt: string | null;
  createdAt: string | null;
};

export type GatewayRoutingLogDto = {
  id: string;
  channel: RoutingChannel;
  action: GatewayRoutingAction;
  success: boolean;
  panelSurveyId: string | null;
  vendorId: string | null;
  allocationId: string | null;
  sessionToken: string;
  failureReason: string;
  sourceIp: string;
  createdAt: string | null;
};

function iso(d: unknown): string | null {
  if (!d) return null;
  const t = d instanceof Date ? d : new Date(String(d));
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

export function toWebhookDeliveryLogDto(doc: Record<string, unknown>): WebhookDeliveryLogDto {
  const vendor = doc.vendorId as Record<string, unknown> | undefined;
  const survey = doc.panelSurveyId as Record<string, unknown> | undefined;
  return {
    id: String(doc._id),
    vendorId: vendor?._id ? String(vendor._id) : String(doc.vendorId ?? ""),
    vendorCode: vendor?.vendorCode ? String(vendor.vendorCode) : null,
    vendorCompanyName: vendor?.companyName ? String(vendor.companyName) : null,
    panelSurveyId: survey?._id ? String(survey._id) : String(doc.panelSurveyId ?? ""),
    surveyName: survey?.surveyName ? String(survey.surveyName) : null,
    surveyCode: survey?.surveyCode ? String(survey.surveyCode) : null,
    allocationId: doc.allocationId ? String(doc.allocationId) : null,
    sessionId: doc.sessionId ? String(doc.sessionId) : null,
    callbackType: doc.callbackType as VendorCallbackOutcome,
    destinationUrl: String(doc.destinationUrl ?? ""),
    responseStatus: doc.responseStatus == null ? null : Number(doc.responseStatus),
    deliveryStatus: doc.deliveryStatus as WebhookDeliveryStatus,
    errorMessage: String(doc.errorMessage ?? ""),
    attemptedAt: iso(doc.attemptedAt),
    createdAt: iso(doc.createdAt)
  };
}

export function toGatewayRoutingLogDto(doc: Record<string, unknown>): GatewayRoutingLogDto {
  return {
    id: String(doc._id),
    channel: doc.channel as RoutingChannel,
    action: doc.action as GatewayRoutingAction,
    success: Boolean(doc.success),
    panelSurveyId: doc.panelSurveyId ? String(doc.panelSurveyId) : null,
    vendorId: doc.vendorId ? String(doc.vendorId) : null,
    allocationId: doc.allocationId ? String(doc.allocationId) : null,
    sessionToken: String(doc.sessionToken ?? ""),
    failureReason: String(doc.failureReason ?? ""),
    sourceIp: String(doc.sourceIp ?? ""),
    createdAt: iso(doc.createdAt)
  };
}
