import type {
  VendorAllocationResponseStatus,
  VendorAllocationStatus
} from "../constants/vendor-allocation";

export type VendorAllocationSurveySummary = {
  id: string;
  surveyName: string;
  surveyCode: string;
  surveyStatus: string;
  remainingQuota: number;
  totalQuota: number;
  targetCountries?: string[];
  estimatedLOI?: number | null;
  incidenceRate?: number | null;
};

export type VendorPortalQuotaGroupDto = {
  id: string;
  groupName: string;
  groupDescription: string;
  totalQuota: number;
  remainingQuota: number;
  status: string;
};

export type VendorAllocationVendorSummary = {
  id: string;
  vendorCode: string;
  companyName: string;
  status: string;
};

export type VendorSurveyAllocationDto = {
  id: string;
  allocationCode: string;
  routingSlug: string;
  panelSurveyId: string;
  vendorId: string;
  panelSurvey: VendorAllocationSurveySummary | null;
  vendor: VendorAllocationVendorSummary | null;
  status: VendorAllocationStatus;
  vendorResponseStatus: VendorAllocationResponseStatus;
  vendorRespondedAt: string | null;
  allocatedQuota: number;
  startedCount: number;
  completedCount: number;
  terminateCount: number;
  quotaFullCount: number;
  qualityRejectCount: number;
  liveRemainingQuota: number;
  conversionRate: number;
  incidenceRate: number;
  vendorCpi: number;
  clientCpi: number;
  marginPerComplete: number;
  routingLink: string;
  startDate: string | null;
  endDate: string | null;
  notes: string;
  createdAt: string | null;
  updatedAt: string | null;
};

/** Vendor portal view — full safe survey specs, no supplier URLs or internal pricing; routingLink hidden until vendor accepts */
export type VendorPortalAllocationDto = {
  id: string;
  allocationCode: string;
  surveyName: string;
  surveyCode: string;
  surveyStatus: string;
  status: VendorAllocationStatus;
  vendorResponseStatus: VendorAllocationResponseStatus;
  vendorRespondedAt: string | null;
  allocatedQuota: number;
  startedCount: number;
  completedCount: number;
  terminateCount: number;
  quotaFullCount: number;
  qualityRejectCount: number;
  liveRemainingQuota: number;
  conversionRate: number;
  incidenceRate: number;
  vendorCpi: number;
  /** Only returned after vendor accepts the allocation */
  routingLink: string | null;
  startDate: string | null;
  endDate: string | null;
  allocationNotes: string;
  createdAt: string | null;
  // Full safe survey specifications
  targetCountries: string[];
  targetGender: string;
  targetAgeMin: number | null;
  targetAgeMax: number | null;
  targetProfessions: string[];
  targetIndustries: string[];
  targetCompanySizes: string[];
  targetDevices: string[];
  targetLanguages: string[];
  estimatedLOI: number | null;
  surveyIncidenceRate: number | null;
  surveyTotalQuota: number;
  surveyRemainingQuota: number;
  dynamicQuotaGroups: VendorPortalQuotaGroupDto[];
  surveyStartDate: string | null;
  surveyEndDate: string | null;
  surveyNotes: string;
};

export type VendorAllocationAnalyticsDto = {
  allocationId: string;
  allocationCode: string;
  status: VendorAllocationStatus;
  allocatedQuota: number;
  liveRemainingQuota: number;
  startedCount: number;
  completedCount: number;
  terminateCount: number;
  quotaFullCount: number;
  qualityRejectCount: number;
  conversionRate: number;
  incidenceRate: number;
  redirectCount: number;
};

function iso(d: unknown): string | null {
  if (!d) return null;
  const t = d instanceof Date ? d : new Date(String(d));
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

/** ObjectId or populated subdocument → string id */
function refId(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && "_id" in (value as object)) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

function normalizeResponseStatus(value: unknown): VendorAllocationResponseStatus {
  if (value === "accepted" || value === "rejected" || value === "pending") {
    return value;
  }
  return "pending";
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapQuotaGroups(value: unknown): VendorPortalQuotaGroupDto[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const g = (raw ?? {}) as Record<string, unknown>;
    return {
      id: String(g._id ?? g.id ?? ""),
      groupName: String(g.groupName ?? ""),
      groupDescription: String(g.groupDescription ?? ""),
      totalQuota: Number(g.totalQuota ?? 0),
      remainingQuota: Number(g.remainingQuota ?? 0),
      status: String(g.status ?? "active")
    };
  });
}

function surveySummary(s: Record<string, unknown> | null | undefined): VendorAllocationSurveySummary | null {
  if (!s?._id) return null;
  return {
    id: String(s._id),
    surveyName: String(s.surveyName ?? ""),
    surveyCode: String(s.surveyCode ?? ""),
    surveyStatus: String(s.surveyStatus ?? ""),
    remainingQuota: Number(s.remainingQuota ?? 0),
    totalQuota: Number(s.totalQuota ?? 0),
    targetCountries: stringArray(s.targetCountries),
    estimatedLOI: optionalNumber(s.estimatedLOI),
    incidenceRate: optionalNumber(s.incidenceRate)
  };
}

function vendorSummary(v: Record<string, unknown> | null | undefined): VendorAllocationVendorSummary | null {
  if (!v?._id) return null;
  return {
    id: String(v._id),
    vendorCode: String(v.vendorCode ?? ""),
    companyName: String(v.companyName ?? ""),
    status: String(v.status ?? "")
  };
}

export function toVendorSurveyAllocationDto(
  doc: Record<string, unknown>,
  opts?: {
    panelSurvey?: Record<string, unknown> | null;
    vendor?: Record<string, unknown> | null;
  }
): VendorSurveyAllocationDto {
  return {
    id: String(doc._id),
    allocationCode: String(doc.allocationCode ?? ""),
    routingSlug: String(doc.routingSlug ?? ""),
    panelSurveyId: refId(doc.panelSurveyId),
    vendorId: refId(doc.vendorId),
    panelSurvey: surveySummary(
      opts?.panelSurvey ??
        (typeof doc.panelSurveyId === "object" && doc.panelSurveyId !== null
          ? (doc.panelSurveyId as Record<string, unknown>)
          : null)
    ),
    vendor: vendorSummary(
      opts?.vendor ??
        (typeof doc.vendorId === "object" && doc.vendorId !== null
          ? (doc.vendorId as Record<string, unknown>)
          : null)
    ),
    status: doc.status as VendorAllocationStatus,
    vendorResponseStatus: normalizeResponseStatus(doc.vendorResponseStatus),
    vendorRespondedAt: iso(doc.vendorRespondedAt),
    allocatedQuota: Number(doc.allocatedQuota ?? 0),
    startedCount: Number(doc.startedCount ?? 0),
    completedCount: Number(doc.completedCount ?? 0),
    terminateCount: Number(doc.terminateCount ?? 0),
    quotaFullCount: Number(doc.quotaFullCount ?? 0),
    qualityRejectCount: Number(doc.qualityRejectCount ?? 0),
    liveRemainingQuota: Number(doc.liveRemainingQuota ?? 0),
    conversionRate: Number(doc.conversionRate ?? 0),
    incidenceRate: Number(doc.incidenceRate ?? 0),
    vendorCpi: Number(doc.vendorCpi ?? 0),
    clientCpi: Number(doc.clientCpi ?? 0),
    marginPerComplete: Number(doc.marginPerComplete ?? 0),
    routingLink: String(doc.routingLink ?? ""),
    startDate: iso(doc.startDate),
    endDate: iso(doc.endDate),
    notes: String(doc.notes ?? ""),
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt)
  };
}

export function toVendorPortalAllocationDto(
  doc: Record<string, unknown>,
  surveyDoc?: Record<string, unknown> | null
): VendorPortalAllocationDto {
  const survey =
    surveyDoc ??
    (typeof doc.panelSurveyId === "object" && doc.panelSurveyId !== null
      ? (doc.panelSurveyId as Record<string, unknown>)
      : {});
  const vendorResponseStatus = normalizeResponseStatus(doc.vendorResponseStatus);

  return {
    id: String(doc._id),
    allocationCode: String(doc.allocationCode ?? ""),
    surveyName: String(survey?.surveyName ?? "Survey"),
    surveyCode: String(survey?.surveyCode ?? ""),
    surveyStatus: String(survey?.surveyStatus ?? ""),
    status: doc.status as VendorAllocationStatus,
    vendorResponseStatus,
    vendorRespondedAt: iso(doc.vendorRespondedAt),
    allocatedQuota: Number(doc.allocatedQuota ?? 0),
    startedCount: Number(doc.startedCount ?? 0),
    completedCount: Number(doc.completedCount ?? 0),
    terminateCount: Number(doc.terminateCount ?? 0),
    quotaFullCount: Number(doc.quotaFullCount ?? 0),
    qualityRejectCount: Number(doc.qualityRejectCount ?? 0),
    liveRemainingQuota: Number(doc.liveRemainingQuota ?? 0),
    conversionRate: Number(doc.conversionRate ?? 0),
    incidenceRate: Number(doc.incidenceRate ?? 0),
    vendorCpi: Number(doc.vendorCpi ?? 0),
    routingLink: vendorResponseStatus === "accepted" ? String(doc.routingLink ?? "") : null,
    startDate: iso(doc.startDate),
    endDate: iso(doc.endDate),
    allocationNotes: String(doc.notes ?? ""),
    createdAt: iso(doc.createdAt),
    targetCountries: stringArray(survey?.targetCountries),
    targetGender: String(survey?.targetGender ?? "all"),
    targetAgeMin: optionalNumber(survey?.targetAgeMin),
    targetAgeMax: optionalNumber(survey?.targetAgeMax),
    targetProfessions: stringArray(survey?.targetProfessions),
    targetIndustries: stringArray(survey?.targetIndustries),
    targetCompanySizes: stringArray(survey?.targetCompanySizes),
    targetDevices: stringArray(survey?.targetDevices),
    targetLanguages: stringArray(survey?.targetLanguages),
    estimatedLOI: optionalNumber(survey?.estimatedLOI),
    surveyIncidenceRate: optionalNumber(survey?.incidenceRate),
    surveyTotalQuota: Number(survey?.totalQuota ?? 0),
    surveyRemainingQuota: Number(survey?.remainingQuota ?? 0),
    dynamicQuotaGroups: mapQuotaGroups(survey?.dynamicQuotaGroups),
    surveyStartDate: iso(survey?.startDate),
    surveyEndDate: iso(survey?.endDate),
    surveyNotes: String(survey?.notes ?? "")
  };
}
