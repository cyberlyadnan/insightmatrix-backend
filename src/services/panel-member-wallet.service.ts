import { Types } from "mongoose";
import { PanelSurvey } from "../models/PanelSurvey";
import { PanelSurveyAttempt } from "../models/PanelSurveyAttempt";
import { User } from "../models/User";
import { WalletLedger } from "../models/WalletLedger";
import { pointsFromPayout } from "../utils/member-panel-profile-match";

export async function listWalletLedger(userId: string, limit = 50) {
  const rows = await WalletLedger.find({ userId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return rows.map((r) => ({
    id: String(r._id),
    type: r.type,
    points: r.points,
    balanceAfter: r.balanceAfter,
    panelSurveyId: r.panelSurveyId ? String(r.panelSurveyId) : null,
    attemptToken: r.attemptToken ?? null,
    description: r.description ?? "",
    createdAt: r.createdAt ? r.createdAt.toISOString() : null
  }));
}

/**
 * On routing `complete`, if `supplierParticipantRef` matches an open member attempt token, credit points once.
 */
export async function tryAwardPointsForComplete(
  panelSurveyId: Types.ObjectId,
  supplierParticipantRef: string | null | undefined,
  eventType: string
): Promise<void> {
  if (eventType !== "complete") return;
  const ref = String(supplierParticipantRef ?? "").trim();
  if (!ref || ref.length < 8) return;

  const attempt = await PanelSurveyAttempt.findOneAndUpdate(
    { token: ref, panelSurveyId, status: "started" },
    { $set: { status: "completed_rewarded" } },
    { new: false }
  ).lean();

  if (!attempt?._id || !attempt.userId) return;

  const survey = await PanelSurvey.findById(panelSurveyId).select("payoutToUser surveyName surveyCode").lean();
  if (!survey) return;

  const points = pointsFromPayout(survey.payoutToUser ?? null);
  const userId = attempt.userId as Types.ObjectId;

  const user = await User.findById(userId).select("panelPoints panelLifetimePoints").lean();
  if (!user) return;

  const nextBalance = (user.panelPoints ?? 0) + points;
  const nextLife = (user.panelLifetimePoints ?? 0) + points;

  await User.updateOne(
    { _id: userId },
    { $set: { panelPoints: nextBalance, panelLifetimePoints: nextLife } }
  );

  await WalletLedger.create({
    userId,
    type: "earned_complete",
    points,
    balanceAfter: nextBalance,
    panelSurveyId,
    attemptToken: ref,
    description: `Survey complete: ${survey.surveyName ?? survey.surveyCode ?? "Study"} (+${points} pts)`
  });
}
