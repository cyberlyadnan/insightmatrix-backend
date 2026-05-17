/** Vendor survey allocation lifecycle */
export const VENDOR_ALLOCATION_STATUSES = ["active", "paused", "completed", "closed"] as const;
export type VendorAllocationStatus = (typeof VENDOR_ALLOCATION_STATUSES)[number];

/** Per-respondent vendor routing session */
export const VENDOR_RESPONDENT_SESSION_STATUSES = [
  "started",
  "redirected",
  "complete",
  "terminate",
  "quota_full",
  "quality_reject"
] as const;
export type VendorRespondentSessionStatus = (typeof VENDOR_RESPONDENT_SESSION_STATUSES)[number];

export const ALLOCATION_CODE_PREFIX = "ALLOC";
export const ALLOCATION_CODE_START_NUMBER = 1001;

/** Maps supplier routing callback event types to vendor session terminal statuses */
export const ROUTING_EVENT_TO_SESSION_STATUS: Record<
  string,
  VendorRespondentSessionStatus | null
> = {
  complete: "complete",
  terminate: "terminate",
  quota_full: "quota_full",
  quality_reject: "quality_reject"
};
