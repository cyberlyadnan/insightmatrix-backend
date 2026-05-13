export const COMPANY_PAYMENT_SOURCES = ["auto_survey_create", "manual"] as const;
export type CompanyPaymentSource = (typeof COMPANY_PAYMENT_SOURCES)[number];

export const COMPANY_PAYMENT_STATUSES = ["pending", "paid", "cancelled"] as const;
export type CompanyPaymentStatus = (typeof COMPANY_PAYMENT_STATUSES)[number];
