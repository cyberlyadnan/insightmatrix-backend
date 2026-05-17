import type { IVendorCallbackRelayService, VendorCallbackRelayContext, VendorCallbackRelayResult } from "./vendor-callback-relay.types";
import { getCallbackUrlForOutcome } from "../../utils/vendor-callback";

/**
 * Stub relay service — architecture only. No HTTP forwarding yet.
 */
export const vendorCallbackRelayService: IVendorCallbackRelayService = {
  resolveTargetUrl(ctx: VendorCallbackRelayContext): string | null {
    return getCallbackUrlForOutcome(ctx.callbackUrls, ctx.outcome);
  },

  async forwardOutcome(ctx: VendorCallbackRelayContext): Promise<VendorCallbackRelayResult> {
    const targetUrl = this.resolveTargetUrl(ctx);
    if (!targetUrl) {
      return { dispatched: false, targetUrl: null, skippedReason: "not_configured" };
    }
    return { dispatched: false, targetUrl, skippedReason: "relay_disabled" };
  }
};
