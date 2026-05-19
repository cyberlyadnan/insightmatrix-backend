/** Compact token prefixes (3 chars + 8 alphanumeric = 11 chars total) */
export const TOKEN_PREFIX_ALLOCATION = "ALC";
export const TOKEN_PREFIX_INTERNAL_SESSION = "IMX";

export const TOKEN_BODY_LENGTH = 8;
export const TOKEN_MIN_LENGTH = 10;
export const TOKEN_MAX_LENGTH = 15;

export const TRAFFIC_TYPES = ["internal_panel", "vendor_panel"] as const;
export type TrafficType = (typeof TRAFFIC_TYPES)[number];

export const RESPONDENT_OWNER_TYPES = ["internal", "vendor"] as const;
export type RespondentOwnerType = (typeof RESPONDENT_OWNER_TYPES)[number];
