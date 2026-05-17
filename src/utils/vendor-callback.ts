import {
  VENDOR_CALLBACK_OUTCOMES,
  type VendorCallbackOutcome
} from "../constants/vendor-callback";
import type { VendorCallbackUrls } from "../types/vendor-callback";

export function emptyVendorCallbackUrls(): VendorCallbackUrls {
  return {
    complete: "",
    terminate: "",
    quota_full: "",
    quality_reject: ""
  };
}

function trimUrl(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalizes callback URL payload from API or legacy documents.
 * Ignores deprecated `callbackBaseUrl` on write; may map it on read when URLs are empty.
 */
export function normalizeVendorCallbackUrls(
  input?: Partial<VendorCallbackUrls> | Record<string, unknown> | null | undefined,
  legacyCallbackBaseUrl?: string | null
): VendorCallbackUrls {
  const base = emptyVendorCallbackUrls();

  if (input != null && typeof input === "object") {
    for (const outcome of VENDOR_CALLBACK_OUTCOMES) {
      const value = (input as Record<string, unknown>)[outcome];
      if (value !== undefined && value !== null) {
        base[outcome] = trimUrl(value);
      }
    }
  }

  const legacy = trimUrl(legacyCallbackBaseUrl);
  const hasAny = VENDOR_CALLBACK_OUTCOMES.some((k) => base[k].length > 0);
  if (!hasAny && legacy) {
    base.complete = legacy;
  }

  return base;
}

export function pickCallbackUrlsFromBody(body: Record<string, unknown>): VendorCallbackUrls | undefined {
  if (body.callbackUrls === undefined) return undefined;
  return normalizeVendorCallbackUrls(body.callbackUrls as Partial<VendorCallbackUrls>);
}

export function getCallbackUrlForOutcome(
  urls: VendorCallbackUrls,
  outcome: VendorCallbackOutcome
): string | null {
  const url = urls[outcome]?.trim();
  return url || null;
}
