import type { RespondentSurveyStatus } from "../constants/survey-respondent";

export type SurveyRespondentProfileDto = {
  id: string;
  panelSurveyId: string;
  allocationId: string | null;
  vendorId: string | null;
  userId: string | null;
  vendorRespondentSessionId: string | null;
  panelSurveyAttemptId: string | null;
  prescreenFormId: string | null;
  respondentOwnerType: string;
  /** Vendor toid or internal-team id from share link (pid, gid, etc.) */
  trackingParticipantId: string;
  /** @deprecated use trackingParticipantId — kept for API compatibility */
  vendorRespondentToid: string;
  internalSessionToken: string;
  prescreenAnswers: Record<string, unknown> | null;
  prescreenCompletedAt: string | null;
  surveyStatus: RespondentSurveyStatus;
  lifecycleHistory: { status: string; note: string; at: string }[];
  trafficSource: string;
  completedAt: string | null;
  createdAt: string | null;
  vendor: { id: string; vendorCode: string; companyName: string } | null;
  panelSurvey: { id: string; surveyName: string; surveyCode: string } | null;
  allocation: { id: string; allocationCode: string; routingSlug: string } | null;
  user: { id: string; name: string; email: string } | null;
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

export function toSurveyRespondentProfileDto(
  doc: Record<string, unknown>
): SurveyRespondentProfileDto {
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
  const user =
    typeof doc.userId === "object" && doc.userId !== null
      ? (doc.userId as Record<string, unknown>)
      : null;

  const history = Array.isArray(doc.lifecycleHistory)
    ? doc.lifecycleHistory.map((h) => {
        const e = h as Record<string, unknown>;
        return {
          status: String(e.status ?? ""),
          note: String(e.note ?? ""),
          at: iso(e.at) ?? ""
        };
      })
    : [];

  return {
    id: String(doc._id),
    panelSurveyId: refId(doc.panelSurveyId),
    allocationId: doc.allocationId ? refId(doc.allocationId) : null,
    vendorId: doc.vendorId ? refId(doc.vendorId) : null,
    userId: doc.userId ? refId(doc.userId) : null,
    vendorRespondentSessionId: doc.vendorRespondentSessionId
      ? String(doc.vendorRespondentSessionId)
      : null,
    panelSurveyAttemptId: doc.panelSurveyAttemptId ? String(doc.panelSurveyAttemptId) : null,
    prescreenFormId: doc.prescreenFormId ? String(doc.prescreenFormId) : null,
    respondentOwnerType: String(doc.respondentOwnerType ?? ""),
    trackingParticipantId: String(doc.vendorRespondentToid ?? ""),
    vendorRespondentToid: String(doc.vendorRespondentToid ?? ""),
    internalSessionToken: String(doc.internalSessionToken ?? ""),
    prescreenAnswers:
      doc.prescreenAnswers && typeof doc.prescreenAnswers === "object"
        ? (doc.prescreenAnswers as Record<string, unknown>)
        : null,
    prescreenCompletedAt: iso(doc.prescreenCompletedAt),
    surveyStatus: doc.surveyStatus as RespondentSurveyStatus,
    lifecycleHistory: history,
    trafficSource: String(doc.trafficSource ?? ""),
    completedAt: iso(doc.completedAt),
    createdAt: iso(doc.createdAt),
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
    user: user
      ? {
          id: refId(user),
          name: String(user.name ?? ""),
          email: String(user.email ?? "")
        }
      : null
  };
}
