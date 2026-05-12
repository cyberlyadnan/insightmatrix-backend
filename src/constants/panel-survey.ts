/** Lifecycle for externally sourced routing surveys */
export const PANEL_SURVEY_STATUSES = ["draft", "active", "paused", "completed"] as const;
export type PanelSurveyStatus = (typeof PANEL_SURVEY_STATUSES)[number];

/** Gender targeting — `all` means no gender filter */
export const PANEL_SURVEY_GENDER_TARGETS = ["all", "male", "female", "other"] as const;
export type PanelSurveyGenderTarget = (typeof PANEL_SURVEY_GENDER_TARGETS)[number];

/** Device buckets for routing UI */
export const PANEL_SURVEY_DEVICE_TYPES = ["desktop", "mobile", "tablet"] as const;
export type PanelSurveyDeviceType = (typeof PANEL_SURVEY_DEVICE_TYPES)[number];

/** Per-quota group lifecycle */
export const PANEL_QUOTA_GROUP_STATUSES = ["active", "paused", "filled"] as const;
export type PanelQuotaGroupStatus = (typeof PANEL_QUOTA_GROUP_STATUSES)[number];
