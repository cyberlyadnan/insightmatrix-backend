/**
 * Vendor outcome callback URLs — align with panel routing event types used for relay.
 * @see panel-survey-routing.ts
 */
export const VENDOR_CALLBACK_OUTCOMES = [
  "complete",
  "terminate",
  "quota_full",
  "quality_reject"
] as const;

export type VendorCallbackOutcome = (typeof VENDOR_CALLBACK_OUTCOMES)[number];

export const VENDOR_CALLBACK_OUTCOME_LABELS: Record<VendorCallbackOutcome, string> = {
  complete: "Complete",
  terminate: "Terminate",
  quota_full: "Quota full",
  quality_reject: "Quality reject"
};
