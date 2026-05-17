import { Types } from "mongoose";
import { Vendor } from "../../models/Vendor";
import { toVendorCallbackOutcome } from "../../constants/routing-callback";
import type { PanelRoutingEventType } from "../../constants/panel-survey-routing";
import { normalizeVendorCallbackUrls, getCallbackUrlForOutcome } from "../../utils/vendor-callback";
import { webhookDeliveryService } from "../webhook/webhook-delivery.service";
import type {
  IVendorCallbackRelayService,
  VendorCallbackRelayContext,
  VendorCallbackRelayResult
} from "./vendor-callback-relay.types";

export type VendorRelayForwardInput = {
  vendorId: Types.ObjectId | string;
  panelSurveyId: Types.ObjectId | string;
  allocationId?: Types.ObjectId | string | null;
  sessionId?: Types.ObjectId | string | null;
  eventType: PanelRoutingEventType;
  participantRef?: string | null;
  supplierProjectPid?: string | null;
  queryParams?: Record<string, string>;
};

export const vendorCallbackRelayService: IVendorCallbackRelayService = {
  resolveTargetUrl(ctx: VendorCallbackRelayContext): string | null {
    return getCallbackUrlForOutcome(ctx.callbackUrls, ctx.outcome);
  },

  async forwardOutcome(ctx: VendorCallbackRelayContext): Promise<VendorCallbackRelayResult> {
    const targetUrl = this.resolveTargetUrl(ctx);
    if (!targetUrl) {
      return { dispatched: false, targetUrl: null, skippedReason: "not_configured" };
    }

    const payload = {
      outcome: ctx.outcome,
      vendorCode: ctx.vendorCode,
      panelSurveyId: ctx.panelSurveyId,
      assignmentId: ctx.assignmentId,
      participantRef: ctx.participantRef,
      supplierPid: ctx.supplierPid,
      recordedAt: ctx.recordedAt ?? new Date().toISOString(),
      query: ctx.queryParams ?? {}
    };

    const result = await webhookDeliveryService.deliverWebhook({
      vendorId: ctx.vendorId,
      panelSurveyId: ctx.panelSurveyId!,
      allocationId: ctx.assignmentId,
      sessionId: null,
      callbackType: ctx.outcome,
      destinationUrl: targetUrl,
      requestPayload: payload
    });

    return {
      dispatched: result.deliveryStatus === "success",
      targetUrl,
      skippedReason: result.deliveryStatus === "success" ? undefined : "delivery_failed"
    };
  }
};

/**
 * Relay supplier outcome to vendor webhook URL when session is vendor-originated.
 */
export async function relayVendorCallbackForSession(
  input: VendorRelayForwardInput
): Promise<VendorCallbackRelayResult> {
  const outcome = toVendorCallbackOutcome(input.eventType);
  if (!outcome) {
    return { dispatched: false, targetUrl: null, skippedReason: "not_configured" };
  }

  const vendor = await Vendor.findById(input.vendorId)
    .select("vendorCode status callbackUrls")
    .lean();
  if (!vendor) {
    return { dispatched: false, targetUrl: null, skippedReason: "not_configured" };
  }
  if (vendor.status === "paused" || vendor.status === "suspended") {
    return { dispatched: false, targetUrl: null, skippedReason: "vendor_paused" };
  }

  const callbackUrls = normalizeVendorCallbackUrls(vendor.callbackUrls);
  const targetUrl = getCallbackUrlForOutcome(callbackUrls, outcome);
  if (!targetUrl) {
    return { dispatched: false, targetUrl: null, skippedReason: "not_configured" };
  }

  const payload = {
    outcome,
    eventType: input.eventType,
    vendorCode: vendor.vendorCode,
    panelSurveyId: String(input.panelSurveyId),
    allocationId: input.allocationId ? String(input.allocationId) : undefined,
    sessionId: input.sessionId ? String(input.sessionId) : undefined,
    participantRef: input.participantRef ?? "",
    supplierProjectPid: input.supplierProjectPid ?? "",
    recordedAt: new Date().toISOString(),
    query: input.queryParams ?? {}
  };

  const delivery = await webhookDeliveryService.deliverWebhook({
    vendorId: input.vendorId,
    panelSurveyId: input.panelSurveyId,
    allocationId: input.allocationId,
    sessionId: input.sessionId,
    callbackType: outcome,
    destinationUrl: targetUrl,
    requestPayload: payload
  });

  return {
    dispatched: delivery.deliveryStatus === "success",
    targetUrl,
    skippedReason: delivery.deliveryStatus === "success" ? undefined : "delivery_failed"
  };
}
