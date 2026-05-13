import crypto from "node:crypto";
import { Types } from "mongoose";
import { ApiError } from "../utils/ApiError";
import { ROLES } from "../constants/roles";
import { PanelSurvey } from "../models/PanelSurvey";
import { PanelSurveyAttempt } from "../models/PanelSurveyAttempt";
import { PrescreenForm } from "../models/PrescreenForm";
import { PrescreenSubmission } from "../models/PrescreenSubmission";
import { toPanelSurveyDto } from "../utils/panel-survey.dto";
import {
  parseMemberPanelProfileFromAnswers,
  pointsFromPayout,
  surveyMatchesMemberProfile
} from "../utils/member-panel-profile-match";

async function latestMemberSubmission(userId: string) {
  const requiredForm = await PrescreenForm.findOne({
    status: "published",
    isRequiredForPanel: true
  })
    .select("_id")
    .lean();
  if (!requiredForm?._id) return null;

  return PrescreenSubmission.findOne({
    userId: new Types.ObjectId(userId),
    formId: requiredForm._id
  })
    .sort({ submittedAt: -1 })
    .lean();
}

export async function getMemberPanelProfileForMatching(userId: string) {
  const sub = await latestMemberSubmission(userId);
  if (!sub?.answers || typeof sub.answers !== "object") return null;
  return parseMemberPanelProfileFromAnswers(sub.answers as Record<string, unknown>);
}

export type MemberSurveyRow = ReturnType<typeof toPanelSurveyDto> & {
  pointsReward: number;
  matchReason: string;
};

export async function listMatchedPanelSurveysForUser(
  userId: string,
  role: string | undefined
): Promise<{ surveys: MemberSurveyRow[]; profileComplete: boolean }> {
  if (role === ROLES.ADMIN) {
    return { surveys: [], profileComplete: true };
  }

  const profile = await getMemberPanelProfileForMatching(userId);
  if (!profile) {
    return { surveys: [], profileComplete: false };
  }

  const now = new Date();
  const surveys = await PanelSurvey.find({
    surveyStatus: "active",
    remainingQuota: { $gt: 0 },
    $and: [
      { $or: [{ startDate: null }, { startDate: { $exists: false } }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }] }
    ]
  })
    .sort({ surveyPriority: -1, createdAt: -1 })
    .limit(80)
    .populate("providerId", "companyName companyCode")
    .lean();

  const matched: MemberSurveyRow[] = [];
  for (const s of surveys) {
    if (!surveyMatchesMemberProfile(s, profile)) continue;
    const dto = toPanelSurveyDto(s as Parameters<typeof toPanelSurveyDto>[0]);
    matched.push({
      ...dto,
      pointsReward: pointsFromPayout(dto.payoutToUser),
      matchReason: "Profile match"
    });
  }

  return { surveys: matched, profileComplete: true };
}

export async function startPanelSurveyAttempt(userId: string, surveyId: string, role: string | undefined) {
  if (role === ROLES.ADMIN) throw new ApiError(403, "Use a member account to start surveys");

  const profile = await getMemberPanelProfileForMatching(userId);
  if (!profile) throw new ApiError(400, "Complete your profile prescreen first.");

  const survey = await PanelSurvey.findById(surveyId).populate("providerId", "companyName companyCode").lean();
  if (!survey || survey.surveyStatus !== "active" || (survey.remainingQuota ?? 0) <= 0) {
    throw new ApiError(404, "Survey not available");
  }

  if (!surveyMatchesMemberProfile(survey, profile)) {
    throw new ApiError(403, "You are not eligible for this survey based on your profile.");
  }

  const now = new Date();
  if (survey.startDate && survey.startDate > now) throw new ApiError(400, "Survey not started yet");
  if (survey.endDate && survey.endDate < now) throw new ApiError(400, "Survey has ended");

  const token = crypto.randomBytes(12).toString("hex");
  const pid = String(survey.supplierProjectPid ?? "").trim();
  if (!pid) throw new ApiError(400, "Survey is missing supplier project id (pid) for tracking");

  await PanelSurveyAttempt.create({
    userId: new Types.ObjectId(userId),
    panelSurveyId: survey._id,
    token,
    supplierProjectPidSnapshot: pid,
    status: "started"
  });

  const dto = toPanelSurveyDto(survey as Parameters<typeof toPanelSurveyDto>[0]);
  const pointsReward = pointsFromPayout(dto.payoutToUser);

  return {
    attemptToken: token,
    supplierProjectPid: pid,
    surveyId: String(survey._id),
    participantQueryParam: dto.participantQueryParam ?? "pid",
    pointsReward,
    surveyName: dto.surveyName
  };
}
