/** External survey supply types — extensible for new integrations */
export const SURVEY_PROVIDER_TYPES = [
  "sample_exchange",
  "router",
  "panel_network",
  "full_service",
  "api_partner",
  "other"
] as const;

export type SurveyProviderType = (typeof SURVEY_PROVIDER_TYPES)[number];

export const SURVEY_COMPANY_STATUSES = ["active", "inactive"] as const;

export type SurveyCompanyStatus = (typeof SURVEY_COMPANY_STATUSES)[number];
