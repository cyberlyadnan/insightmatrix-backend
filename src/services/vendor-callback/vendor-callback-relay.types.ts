import type { VendorCallbackOutcome } from "../../constants/vendor-callback";
import type { VendorCallbackUrls } from "../../types/vendor-callback";

/** Context for future vendor callback forwarding after supplier → platform outcome. */
export type VendorCallbackRelayContext = {
  vendorId: string;
  vendorCode: string;
  outcome: VendorCallbackOutcome;
  callbackUrls: VendorCallbackUrls;
  /** Supplier / platform session identifiers — populated when relay is implemented */
  panelSurveyId?: string;
  assignmentId?: string;
  participantRef?: string;
  supplierPid?: string;
  recordedAt?: string;
  queryParams?: Record<string, string>;
};

export type VendorCallbackRelayResult = {
  dispatched: boolean;
  targetUrl: string | null;
  skippedReason?: "not_configured" | "vendor_paused" | "relay_disabled" | "delivery_failed";
};

/**
 * Future: POST outcome to vendor-configured URL with retries and signature.
 * @see vendor-callback-webhook.types.ts
 */
export interface IVendorCallbackRelayService {
  resolveTargetUrl(ctx: VendorCallbackRelayContext): string | null;
  forwardOutcome(ctx: VendorCallbackRelayContext): Promise<VendorCallbackRelayResult>;
}
