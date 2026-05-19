import type { VendorRespondentSessionStatus } from "../constants/vendor-allocation";

export type VendorRespondentTrackingDto = {
  id: string;
  vendor: { id: string; vendorCode: string; companyName: string } | null;
  panelSurvey: { id: string; surveyName: string; surveyCode: string } | null;
  allocation: { id: string; allocationCode: string; routingSlug: string } | null;
  vendorRespondentToid: string;
  internalSessionToken: string;
  supplierReturnedToken: string;
  supplierProjectPid: string;
  status: VendorRespondentSessionStatus;
  responseStatus: VendorRespondentSessionStatus;
  callbackForwarded: boolean;
  callbackForwardedAt: string | null;
  trafficType: string;
  respondentOwnerType: string;
  trafficSource: string;
  startedAt: string | null;
  redirectedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
};

function iso(d: unknown): string | null {
  if (!d) return null;
  const t = d instanceof Date ? d : new Date(String(d));
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

function refId(v: unknown): string {
  if (!v) return "";
  if (typeof v === "object" && v !== null && "_id" in v) return String((v as { _id: unknown })._id);
  return String(v);
}

export function toVendorRespondentTrackingDto(
  doc: Record<string, unknown>
): VendorRespondentTrackingDto {
  const vendor =
    typeof doc.vendorId === "object" && doc.vendorId !== null
      ? (doc.vendorId as Record<string, unknown>)
      : null;
  const survey =
    typeof doc.panelSurveyId === "object" && doc.panelSurveyId !== null
      ? (doc.panelSurveyId as Record<string, unknown>)
      : null;
  const allocation =
    typeof doc.allocationId === "object" && doc.allocationId !== null
      ? (doc.allocationId as Record<string, unknown>)
      : null;

  return {
    id: String(doc._id),
    vendor: vendor
      ? {
          id: refId(vendor),
          vendorCode: String(vendor.vendorCode ?? ""),
          companyName: String(vendor.companyName ?? "")
        }
      : null,
    panelSurvey: survey
      ? {
          id: refId(survey),
          surveyName: String(survey.surveyName ?? ""),
          surveyCode: String(survey.surveyCode ?? "")
        }
      : null,
    allocation: allocation
      ? {
          id: refId(allocation),
          allocationCode: String(allocation.allocationCode ?? ""),
          routingSlug: String(allocation.routingSlug ?? "")
        }
      : null,
    vendorRespondentToid: String(doc.vendorRespondentToid ?? doc.vendorRespondentId ?? ""),
    internalSessionToken: String(doc.internalSessionToken ?? doc.sessionToken ?? ""),
    supplierReturnedToken: String(doc.supplierReturnedToken ?? ""),
    supplierProjectPid: String(doc.supplierProjectPid ?? ""),
    status: doc.status as VendorRespondentSessionStatus,
    responseStatus: (doc.responseStatus ?? doc.status) as VendorRespondentSessionStatus,
    callbackForwarded: Boolean(doc.callbackForwarded),
    callbackForwardedAt: iso(doc.callbackForwardedAt),
    trafficType: String(doc.trafficType ?? "vendor_panel"),
    respondentOwnerType: String(doc.respondentOwnerType ?? "vendor"),
    trafficSource: String(doc.trafficSource ?? ""),
    startedAt: iso(doc.startedAt),
    redirectedAt: iso(doc.redirectedAt),
    completedAt: iso(doc.completedAt),
    createdAt: iso(doc.createdAt)
  };
}
