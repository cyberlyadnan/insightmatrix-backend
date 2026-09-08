import { Types } from "mongoose";
import { PanelSurveyAttempt } from "../models/PanelSurveyAttempt";
import { PanelSurvey } from "../models/PanelSurvey";
import { PanelSurveyRoutingEvent } from "../models/PanelSurveyRoutingEvent";
import { SurveyRespondentProfile } from "../models/SurveyRespondentProfile";
import { WalletLedger } from "../models/WalletLedger";
import { pointsFromPayout } from "../utils/member-panel-profile-match";

export type MemberAttemptOutcome =
  | "completed"
  | "in_progress"
  | "terminated"
  | "quota_full"
  | "quality_reject"
  | "screenout";

export type MemberSurveyHistoryItem = {
  id: string;
  attemptToken: string;
  surveyId: string;
  surveyName: string;
  surveyCode: string;
  estimatedLOI: number | null;
  attemptStatus: "started" | "completed_rewarded";
  outcome: MemberAttemptOutcome;
  outcomeLabel: string;
  pointsAwarded: number;
  pointsPotential: number;
  startedAt: string | null;
  resolvedAt: string | null;
  providerName: string | null;
};

export type MemberSurveyHistorySummary = {
  totalAttempts: number;
  completed: number;
  inProgress: number;
  notQualified: number;
  pointsFromSurveys: number;
};

function mapOutcome(
  attemptStatus: string,
  eventType: string | null,
  profileStatus: string | null
): MemberAttemptOutcome {
  if (attemptStatus === "completed_rewarded") return "completed";

  const fromEvent = (eventType || "").toLowerCase();
  if (fromEvent === "complete") return "completed";
  if (fromEvent === "terminate") return "terminated";
  if (fromEvent === "screenout") return "screenout";
  if (fromEvent === "quota_full") return "quota_full";
  if (fromEvent === "quality_reject") return "quality_reject";

  const fromProfile = (profileStatus || "").toLowerCase();
  if (fromProfile === "complete") return "completed";
  if (fromProfile === "terminate") return "terminated";
  if (fromProfile === "quota_full") return "quota_full";
  if (fromProfile === "quality_reject") return "quality_reject";

  return "in_progress";
}

function outcomeLabel(outcome: MemberAttemptOutcome): string {
  switch (outcome) {
    case "completed":
      return "Completed";
    case "in_progress":
      return "In progress";
    case "terminated":
      return "Terminated";
    case "screenout":
      return "Screened out";
    case "quota_full":
      return "Quota full";
    case "quality_reject":
      return "Quality reject";
    default:
      return "Unknown";
  }
}

export async function listMemberSurveyHistory(
  userId: string,
  opts?: { limit?: number }
): Promise<{ items: MemberSurveyHistoryItem[]; summary: MemberSurveyHistorySummary }> {
  const limit = Math.min(Math.max(Number(opts?.limit) || 100, 1), 200);
  const uid = new Types.ObjectId(userId);

  const attempts = await PanelSurveyAttempt.find({ userId: uid })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  if (attempts.length === 0) {
    return {
      items: [],
      summary: {
        totalAttempts: 0,
        completed: 0,
        inProgress: 0,
        notQualified: 0,
        pointsFromSurveys: 0
      }
    };
  }

  const surveyIds = [...new Set(attempts.map((a) => String(a.panelSurveyId)))];
  const tokens = attempts.map((a) => a.token).filter(Boolean);
  const attemptIds = attempts.map((a) => a._id);

  const [surveys, events, profiles, ledgerRows] = await Promise.all([
    PanelSurvey.find({ _id: { $in: surveyIds } })
      .select("surveyName surveyCode estimatedLOI payoutToUser providerId")
      .populate("providerId", "companyName")
      .lean(),
    PanelSurveyRoutingEvent.find({
      supplierParticipantRef: { $in: tokens }
    })
      .sort({ createdAt: -1 })
      .lean(),
    SurveyRespondentProfile.find({
      $or: [
        { panelSurveyAttemptId: { $in: attemptIds } },
        { internalSessionToken: { $in: tokens } }
      ]
    })
      .select("panelSurveyAttemptId internalSessionToken surveyStatus completedAt updatedAt")
      .lean(),
    WalletLedger.find({
      userId: uid,
      attemptToken: { $in: tokens },
      type: "earned_complete"
    })
      .select("attemptToken points")
      .lean()
  ]);

  const surveyById = new Map(surveys.map((s) => [String(s._id), s]));

  /** Latest event per participant ref */
  const latestEventByToken = new Map<string, (typeof events)[number]>();
  for (const ev of events) {
    const ref = String(ev.supplierParticipantRef || "").trim();
    if (!ref || latestEventByToken.has(ref)) continue;
    latestEventByToken.set(ref, ev);
  }

  const profileByAttemptId = new Map<string, (typeof profiles)[number]>();
  const profileByToken = new Map<string, (typeof profiles)[number]>();
  for (const p of profiles) {
    if (p.panelSurveyAttemptId) {
      profileByAttemptId.set(String(p.panelSurveyAttemptId), p);
    }
    const tok = String(p.internalSessionToken || "").trim();
    if (tok) profileByToken.set(tok, p);
  }

  const pointsByToken = new Map<string, number>();
  for (const row of ledgerRows) {
    const tok = String(row.attemptToken || "").trim();
    if (!tok) continue;
    pointsByToken.set(tok, (pointsByToken.get(tok) ?? 0) + Number(row.points || 0));
  }

  const items: MemberSurveyHistoryItem[] = attempts.map((a) => {
    const survey = surveyById.get(String(a.panelSurveyId));
    const token = a.token;
    const event = latestEventByToken.get(token) ?? null;
    const profile =
      profileByAttemptId.get(String(a._id)) ?? profileByToken.get(token) ?? null;

    const outcome = mapOutcome(
      a.status,
      event?.eventType ? String(event.eventType) : null,
      profile?.surveyStatus ? String(profile.surveyStatus) : null
    );

    const pointsAwarded = pointsByToken.get(token) ?? (outcome === "completed" ? 0 : 0);
    // If completed_rewarded but ledger missing (legacy), show potential payout as awarded estimate only when status says rewarded
    const potential = pointsFromPayout(survey?.payoutToUser ?? null);
    const awarded =
      pointsAwarded > 0
        ? pointsAwarded
        : a.status === "completed_rewarded"
          ? potential
          : 0;

    const provider = survey?.providerId as { companyName?: string } | null | undefined;
    const resolvedAt =
      profile?.completedAt?.toISOString?.() ||
      (outcome !== "in_progress"
        ? event?.createdAt?.toISOString?.() ||
          (a.status === "completed_rewarded" ? a.updatedAt?.toISOString?.() : null)
        : null) ||
      null;

    return {
      id: String(a._id),
      attemptToken: token,
      surveyId: String(a.panelSurveyId),
      surveyName: survey?.surveyName || "Survey",
      surveyCode: survey?.surveyCode || "",
      estimatedLOI: survey?.estimatedLOI ?? null,
      attemptStatus: a.status as "started" | "completed_rewarded",
      outcome,
      outcomeLabel: outcomeLabel(outcome),
      pointsAwarded: awarded,
      pointsPotential: potential,
      startedAt: a.createdAt ? a.createdAt.toISOString() : null,
      resolvedAt,
      providerName: provider?.companyName ?? null
    };
  });

  const summary: MemberSurveyHistorySummary = {
    totalAttempts: items.length,
    completed: items.filter((i) => i.outcome === "completed").length,
    inProgress: items.filter((i) => i.outcome === "in_progress").length,
    notQualified: items.filter((i) =>
      ["terminated", "screenout", "quota_full", "quality_reject"].includes(i.outcome)
    ).length,
    pointsFromSurveys: items.reduce((sum, i) => sum + (i.pointsAwarded || 0), 0)
  };

  return { items, summary };
}
