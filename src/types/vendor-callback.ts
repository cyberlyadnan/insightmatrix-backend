import type { VendorCallbackOutcome } from "../constants/vendor-callback";

/** Per-outcome HTTPS endpoints for vendor callback relay (storage + UI; forwarding not implemented). */
export type VendorCallbackUrls = Record<VendorCallbackOutcome, string>;

/** Placeholder for future per-outcome delivery health (webhook testing utility). */
export type VendorCallbackOutcomeStatus = "not_configured" | "configured" | "untested";

export type VendorCallbackConfigurationStatus = Record<
  VendorCallbackOutcome,
  VendorCallbackOutcomeStatus
>;

/** Future webhook log row — persistence not implemented. */
export type VendorCallbackWebhookLogStatus =
  | "pending"
  | "success"
  | "failed"
  | "retrying"
  | "cancelled";

export type VendorCallbackWebhookLogEntry = {
  id: string;
  vendorId: string;
  outcome: VendorCallbackOutcome;
  targetUrl: string;
  status: VendorCallbackWebhookLogStatus;
  attempt: number;
  maxAttempts: number;
  httpStatus: number | null;
  errorMessage: string | null;
  createdAt: string;
  nextRetryAt: string | null;
};
