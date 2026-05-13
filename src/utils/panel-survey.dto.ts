import type { PanelQuotaGroupStatus, PanelSurveyStatus } from '../constants/panel-survey';

export type PanelSurveyProviderSummary = {
  id: string;
  companyName: string;
  companyCode: string;
};

export type PanelSurveyQuotaGroupDto = {
  id: string;
  groupName: string;
  groupDescription: string;
  totalQuota: number;
  remainingQuota: number;
  status: PanelQuotaGroupStatus;
};

export type PanelSurveyDto = {
  id: string;
  surveyName: string;
  surveyCode: string;
  externalSurveyId: string;
  providerId: string;
  provider: PanelSurveyProviderSummary | null;
  surveyStatus: PanelSurveyStatus;
  externalSurveyUrl: string;
  supplierProjectPid: string;
  trackingParameterName: string;
  participantQueryParam: string;
  targetCountries: string[];
  targetGender: string;
  targetAgeMin: number | null;
  targetAgeMax: number | null;
  targetProfessions: string[];
  targetIndustries: string[];
  targetCompanySizes: string[];
  targetDevices: string[];
  targetLanguages: string[];
  incidenceRate: number | null;
  estimatedLOI: number | null;
  payoutToUser: number | null;
  revenuePerComplete: number | null;
  companyBillingAmount: number;
  companyBillingTaxPercent: number;
  totalQuota: number;
  remainingQuota: number;
  dynamicQuotaGroups: PanelSurveyQuotaGroupDto[];
  surveyPriority: number;
  maxMemberAttempts: number;
  startDate: string | null;
  endDate: string | null;
  notes: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PanelSurveyPublicDto = {
  id: string;
  surveyName: string;
  estimatedLOI: number | null;
  payoutToUser: number | null;
  targetCountries: string[];
  surveyStatus: PanelSurveyStatus;
  externalSurveyUrl: string;
  /** Supplier URL query key we append with the participant id from the landing URL */
  trackingParameterName: string;
  /** Query key panels use on OUR landing URL (e.g. ?pid=…) — read client-side and forwarded as trackingParameterName */
  participantQueryParam: string;
  providerName: string | null;
  providerCode: string | null;
};

function groupDto(sub: {
  _id?: unknown;
  groupName: string;
  groupDescription?: string;
  totalQuota: number;
  remainingQuota: number;
  status: PanelQuotaGroupStatus;
}): PanelSurveyQuotaGroupDto {
  return {
    id: String(sub._id ?? ""),
    groupName: sub.groupName,
    groupDescription: sub.groupDescription ?? "",
    totalQuota: sub.totalQuota,
    remainingQuota: sub.remainingQuota,
    status: sub.status
  };
}

function resolveProvider(
  providerId: unknown
): { summary: PanelSurveyProviderSummary | null; providerObjectId: string } {
  if (
    providerId &&
    typeof providerId === "object" &&
    "_id" in providerId &&
    "companyName" in providerId
  ) {
    const p = providerId as { _id: unknown; companyName?: string; companyCode?: string };
    return {
      summary: {
        id: String(p._id),
        companyName: p.companyName ?? "",
        companyCode: p.companyCode ?? ""
      },
      providerObjectId: String(p._id)
    };
  }
  return {
    summary: null,
    providerObjectId: String(providerId ?? "")
  };
}

export function toPanelSurveyDto(doc: {
  _id: unknown;
  surveyName: string;
  surveyCode: string;
  externalSurveyId?: string;
  providerId: unknown;
  surveyStatus: PanelSurveyStatus;
  externalSurveyUrl: string;
  supplierProjectPid?: string;
  trackingParameterName?: string;
  participantQueryParam?: string;
  targetCountries?: string[];
  targetGender?: string;
  targetAgeMin?: number | null;
  targetAgeMax?: number | null;
  targetProfessions?: string[];
  targetIndustries?: string[];
  targetCompanySizes?: string[];
  targetDevices?: string[];
  targetLanguages?: string[];
  incidenceRate?: number | null;
  estimatedLOI?: number | null;
  payoutToUser?: number | null;
  revenuePerComplete?: number | null;
  companyBillingAmount?: number | null;
  companyBillingTaxPercent?: number | null;
  totalQuota?: number;
  remainingQuota?: number;
  dynamicQuotaGroups?: Array<{
    _id?: unknown;
    groupName: string;
    groupDescription?: string;
    totalQuota: number;
    remainingQuota: number;
    status: PanelQuotaGroupStatus;
  }>;
  surveyPriority?: number;
  maxMemberAttempts?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}): PanelSurveyDto {
  const { summary: providerSummary, providerObjectId } = resolveProvider(doc.providerId);

  return {
    id: String(doc._id),
    surveyName: doc.surveyName,
    surveyCode: doc.surveyCode,
    externalSurveyId: doc.externalSurveyId ?? "",
    providerId: providerObjectId,
    provider: providerSummary,
    surveyStatus: doc.surveyStatus,
    externalSurveyUrl: doc.externalSurveyUrl,
    supplierProjectPid: doc.supplierProjectPid ?? "",
    trackingParameterName: doc.trackingParameterName ?? "toid",
    participantQueryParam: doc.participantQueryParam ?? "pid",
    targetCountries: doc.targetCountries ?? [],
    targetGender: doc.targetGender ?? "all",
    targetAgeMin: doc.targetAgeMin ?? null,
    targetAgeMax: doc.targetAgeMax ?? null,
    targetProfessions: doc.targetProfessions ?? [],
    targetIndustries: doc.targetIndustries ?? [],
    targetCompanySizes: doc.targetCompanySizes ?? [],
    targetDevices: doc.targetDevices ?? [],
    targetLanguages: doc.targetLanguages ?? [],
    incidenceRate: doc.incidenceRate ?? null,
    estimatedLOI: doc.estimatedLOI ?? null,
    payoutToUser: doc.payoutToUser ?? null,
    revenuePerComplete: doc.revenuePerComplete ?? null,
    companyBillingAmount: Math.round(Math.max(0, Number(doc.companyBillingAmount ?? 0)) * 100) / 100,
    companyBillingTaxPercent: Math.min(100, Math.max(0, Number(doc.companyBillingTaxPercent ?? 0))),
    totalQuota: doc.totalQuota ?? 0,
    remainingQuota: doc.remainingQuota ?? 0,
    dynamicQuotaGroups: (doc.dynamicQuotaGroups ?? []).map(groupDto),
    surveyPriority: doc.surveyPriority ?? 0,
    maxMemberAttempts: Math.min(10, Math.max(1, Number(doc.maxMemberAttempts ?? 2))),
    startDate: doc.startDate ? doc.startDate.toISOString() : null,
    endDate: doc.endDate ? doc.endDate.toISOString() : null,
    notes: doc.notes ?? "",
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null
  };
}

export function toPanelSurveyPublicDto(doc: {
  _id: unknown;
  surveyName: string;
  estimatedLOI?: number | null;
  payoutToUser?: number | null;
  targetCountries?: string[];
  surveyStatus: PanelSurveyStatus;
  externalSurveyUrl: string;
  trackingParameterName?: string;
  participantQueryParam?: string;
  providerId: unknown;
}): PanelSurveyPublicDto {
  const { summary } = resolveProvider(doc.providerId);
  return {
    id: String(doc._id),
    surveyName: doc.surveyName,
    estimatedLOI: doc.estimatedLOI ?? null,
    payoutToUser: doc.payoutToUser ?? null,
    targetCountries: doc.targetCountries ?? [],
    surveyStatus: doc.surveyStatus,
    externalSurveyUrl: doc.externalSurveyUrl,
    trackingParameterName: doc.trackingParameterName ?? "toid",
    participantQueryParam: doc.participantQueryParam ?? "pid",
    providerName: summary?.companyName ?? null,
    providerCode: summary?.companyCode ?? null
  };
}
