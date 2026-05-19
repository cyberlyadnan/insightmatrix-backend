import { VENDOR_RESPONDENT_SESSION_STATUSES } from "./vendor-allocation";
import { RESPONDENT_OWNER_TYPES } from "./token";

/** Respondent warehouse lifecycle — mirrors routing terminal outcomes */
export const RESPONDENT_SURVEY_STATUSES = [
  "prescreen_pending",
  "started",
  "redirected",
  ...VENDOR_RESPONDENT_SESSION_STATUSES.filter((s) => s !== "started")
] as const;

export type RespondentSurveyStatus = (typeof RESPONDENT_SURVEY_STATUSES)[number];

export { RESPONDENT_OWNER_TYPES };
export type { RespondentOwnerType } from "./token";
