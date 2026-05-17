/** B2B subpanel vendor lifecycle — separate from panel users and admins */
export const VENDOR_STATUSES = ["active", "paused", "suspended"] as const;

export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export const VENDOR_CODE_PREFIX = "VND";

export const VENDOR_CODE_START_NUMBER = 1001;
