import { Types } from "mongoose";
import type { PanelRoutingEventType } from "../../constants/panel-survey-routing";
import { isRelayableRoutingEvent } from "../../constants/routing-callback";
import { recordRoutingEventBySupplierProjectPid } from "../panel-survey-analytics.service";
import { tryApplyOutcomeFromRoutingEvent } from "../vendor-allocation/session-tracking.service";
import { relayVendorCallbackForSession } from "../vendor-callback/vendor-callback-relay.service";
import { Vendor } from "../../models/Vendor";
import { logGatewayEvent } from "./routing-gateway.service";
import { routingSessionService } from "./routing-session.service";

export type SupplierCallbackPayload = {
  supplierProjectPid: string;
  eventType: PanelRoutingEventType;
  quotaGroupId?: string | null;
  quotaGroupName?: string | null;
  supplierParticipantRef?: string | null;
  meta?: unknown;
};

export type SupplierCallbackResult = {
  routingEventId: string;
  sessionType: "vendor" | "panel" | null;
  vendorRelay: {
    dispatched: boolean;
    targetUrl: string | null;
    skippedReason?: string;
  } | null;
};

/**
 * Unified supplier callback pipeline:
 * analytics → session update → vendor relay → gateway logs
 */
export async function processSupplierCallback(
  payload: SupplierCallbackPayload
): Promise<SupplierCallbackResult> {
  const participantRef = String(payload.supplierParticipantRef ?? "").trim();

  await logGatewayEvent({
    channel: "vendor",
    action: "callback_received",
    success: true,
    sessionToken: participantRef,
    metadata: {
      eventType: payload.eventType,
      supplierProjectPid: payload.supplierProjectPid
    }
  });

  const routingDoc = await recordRoutingEventBySupplierProjectPid(payload.supplierProjectPid, {
    eventType: payload.eventType,
    quotaGroupId: payload.quotaGroupId,
    quotaGroupName: payload.quotaGroupName,
    supplierParticipantRef: payload.supplierParticipantRef,
    meta: payload.meta ?? null
  });

  await tryApplyOutcomeFromRoutingEvent(participantRef, payload.eventType).catch(() => {});

  const resolved = await routingSessionService.resolveByParticipantRef(participantRef);

  let vendorRelay: SupplierCallbackResult["vendorRelay"] = null;

  if (resolved?.type === "vendor" && isRelayableRoutingEvent(payload.eventType)) {
    const relay = await relayVendorCallbackForSession({
      vendorId: resolved.vendorId,
      panelSurveyId: resolved.panelSurveyId,
      allocationId: resolved.allocationId,
      sessionId: resolved.sessionId,
      eventType: payload.eventType,
      participantRef,
      supplierProjectPid: payload.supplierProjectPid,
      queryParams:
        payload.meta && typeof payload.meta === "object" && "query" in (payload.meta as object)
          ? ((payload.meta as { query?: Record<string, string> }).query ?? {})
          : {}
    });

    vendorRelay = {
      dispatched: relay.dispatched,
      targetUrl: relay.targetUrl,
      skippedReason: relay.skippedReason
    };

    await logGatewayEvent({
      channel: "vendor",
      action: relay.dispatched ? "callback_forwarded" : "callback_forward_skipped",
      success: relay.dispatched,
      panelSurveyId: resolved.panelSurveyId,
      vendorId: resolved.vendorId,
      allocationId: resolved.allocationId,
      sessionToken: participantRef,
      failureReason: relay.skippedReason,
      metadata: { eventType: payload.eventType, targetUrl: relay.targetUrl }
    });

    if (relay.dispatched) {
      await Vendor.updateOne(
        { _id: resolved.vendorId },
        {
          $inc: {
            totalCompletes:
              payload.eventType === "complete"
                ? 1
                : 0,
            totalTerminates: payload.eventType === "terminate" ? 1 : 0,
            totalQuotaFull: payload.eventType === "quota_full" ? 1 : 0,
            totalQualityRejects: payload.eventType === "quality_reject" ? 1 : 0
          }
        }
      ).catch(() => {});
    }
  }

  return {
    routingEventId: String(routingDoc._id),
    sessionType: resolved?.type ?? null,
    vendorRelay
  };
}

export const routingCallbackProcessorService = {
  processSupplierCallback
};
