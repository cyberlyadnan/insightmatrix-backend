import type { PanelRoutingEventType } from "./panel-survey-routing";
import type { VendorCallbackOutcome } from "./vendor-callback";
import { VENDOR_CALLBACK_OUTCOMES } from "./vendor-callback";

/**
 * Supplier routing outcomes that map to vendor callback URLs and relay.
 * screenout / duplicate are recorded internally only.
 */
export const RELAYABLE_ROUTING_OUTCOMES = VENDOR_CALLBACK_OUTCOMES;

export type RelayableRoutingOutcome = VendorCallbackOutcome;

export const PANEL_EVENT_TO_VENDOR_CALLBACK: Partial<
  Record<PanelRoutingEventType, VendorCallbackOutcome>
> = {
  complete: "complete",
  terminate: "terminate",
  quota_full: "quota_full",
  quality_reject: "quality_reject"
};

export function toVendorCallbackOutcome(
  eventType: PanelRoutingEventType
): VendorCallbackOutcome | null {
  return PANEL_EVENT_TO_VENDOR_CALLBACK[eventType] ?? null;
}

export function isRelayableRoutingEvent(eventType: PanelRoutingEventType): boolean {
  return eventType in PANEL_EVENT_TO_VENDOR_CALLBACK;
}
