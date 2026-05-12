import type { SurveyCompanyStatus, SurveyProviderType } from '../constants/survey-company';

export type SurveyCompanyDto = {
  id: string;
  companyName: string;
  companyCode: string;
  contactPersonName: string;
  companyEmail: string;
  companyPhone: string;
  websiteUrl: string;
  providerType: SurveyProviderType;
  status: SurveyCompanyStatus;
  notes: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type SurveyCompanyDoc = {
  _id: { toString(): string };
  companyName: string;
  companyCode: string;
  contactPersonName?: string;
  companyEmail?: string;
  companyPhone?: string;
  websiteUrl?: string;
  providerType: SurveyProviderType;
  status: SurveyCompanyStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toSurveyCompanyDto(doc: SurveyCompanyDoc): SurveyCompanyDto {
  return {
    id: String(doc._id),
    companyName: doc.companyName,
    companyCode: doc.companyCode,
    contactPersonName: doc.contactPersonName ?? "",
    companyEmail: doc.companyEmail ?? "",
    companyPhone: doc.companyPhone ?? "",
    websiteUrl: doc.websiteUrl ?? "",
    providerType: doc.providerType,
    status: doc.status,
    notes: doc.notes ?? "",
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null
  };
}
