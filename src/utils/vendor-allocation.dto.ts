import type { VendorAllocationStatus } from "../constants/vendor-allocation";

export type VendorAllocationSurveySummary = {
  id: string;
  surveyName: string;
  surveyCode: string;
  surveyStatus: string;
  remainingQuota: number;
  totalQuota: number;
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
  panelSurveyId: string;
  vendorId: string;
  panelSurvey: VendorAllocationSurveySummary | null;
  vendor: VendorAllocationVendorSummary | null;
  status: VendorAllocationStatus;
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

/** Vendor portal view — no supplier URLs or internal supplier fields */
export type VendorPortalAllocationDto = {
  id: string;
  allocationCode: string;
  surveyName: string;
  surveyCode: string;
  status: VendorAllocationStatus;
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
  routingLink: string;
  startDate: string | null;
  endDate: string | null;
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

function surveySummary(s: Record<string, unknown> | null | undefined): VendorAllocationSurveySummary | null {
  if (!s?._id) return null;
  return {
    id: String(s._id),
    surveyName: String(s.surveyName ?? ""),
    surveyCode: String(s.surveyCode ?? ""),
    surveyStatus: String(s.surveyStatus ?? ""),
    remainingQuota: Number(s.remainingQuota ?? 0),
    totalQuota: Number(s.totalQuota ?? 0)
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
  survey: { surveyName: string; surveyCode: string }
): VendorPortalAllocationDto {
  return {
    id: String(doc._id),
    allocationCode: String(doc.allocationCode ?? ""),
    surveyName: survey.surveyName,
    surveyCode: survey.surveyCode,
    status: doc.status as VendorAllocationStatus,
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
    routingLink: String(doc.routingLink ?? ""),
    startDate: iso(doc.startDate),
    endDate: iso(doc.endDate)
  };
}
