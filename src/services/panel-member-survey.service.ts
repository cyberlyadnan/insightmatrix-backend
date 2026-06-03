import crypto from "node:crypto";
import { Types } from "mongoose";
import { ApiError } from "../utils/ApiError";
import { ROLES } from "../constants/roles";
import { PanelSurvey } from "../models/PanelSurvey";
import { PanelSurveyAttempt } from "../models/PanelSurveyAttempt";
import { PrescreenSubmission } from "../models/PrescreenSubmission";
import { findPublishedRequiredPanelPrescreen } from "./panel-prescreen.service";
import { toPanelSurveyDto } from "../utils/panel-survey.dto";
import {
  parseMemberPanelProfileFromAnswers,
  pointsFromPayout,
  surveyMatchesMemberProfile
} from "../utils/member-panel-profile-match";

async function latestMemberSubmission(userId: string) {
  const requiredForm = await findPublishedRequiredPanelPrescreen();
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

export type MemberSurveyParticipation = {
  status: "available" | "completed" | "no_attempts_left";
  attemptsUsed: number;
  maxAttempts: number;
};

export type MemberSurveyRow = ReturnType<typeof toPanelSurveyDto> & {
  pointsReward: number;
  matchReason: string;
  memberParticipation: MemberSurveyParticipation;
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
      matchReason: "Profile match",
      memberParticipation: {
        status: "available",
        attemptsUsed: 0,
        maxAttempts: dto.maxMemberAttempts
      }
    });
  }

  if (matched.length > 0) {
    const userOid = new Types.ObjectId(userId);
    const surveyObjectIds = matched.map((m) => new Types.ObjectId(m.id));

    const [completedRows, countRows] = await Promise.all([
      PanelSurveyAttempt.find({
        userId: userOid,
        panelSurveyId: { $in: surveyObjectIds },
        status: "completed_rewarded"
      })
        .select("panelSurveyId")
        .lean(),
      PanelSurveyAttempt.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { userId: userOid, panelSurveyId: { $in: surveyObjectIds } } },
        { $group: { _id: "$panelSurveyId", count: { $sum: 1 } } }
      ])
    ]);

    const completedSet = new Set(completedRows.map((r) => String(r.panelSurveyId)));
    const countBySurvey = new Map<string, number>();
    for (const row of countRows) {
      countBySurvey.set(String(row._id), row.count);
    }

    for (const m of matched) {
      const attemptsUsed = countBySurvey.get(m.id) ?? 0;
      const maxAttempts = m.maxMemberAttempts;
      const completed = completedSet.has(m.id);
      m.memberParticipation = {
        attemptsUsed,
        maxAttempts,
        status: completed ? "completed" : attemptsUsed >= maxAttempts ? "no_attempts_left" : "available"
      };
    }
  }

  return { surveys: matched, profileComplete: true };
}

export async function startPanelSurveyAttempt(userId: string, surveyId: string, role: string | undefined) {
  if (role === ROLES.ADMIN) throw new ApiError(403, "Use a member account to start surveys");

  const profile = await getMemberPanelProfileForMatching(userId);
  if (!profile) throw new ApiError(400, "Complete your profile prescreen first.");

  const { validatePanelSurveyForRouting } = await import("./routing/routing-gateway.service");
  try {
    await validatePanelSurveyForRouting(surveyId);
  } catch {
    throw new ApiError(404, "Survey not available");
  }

  const survey = await PanelSurvey.findById(surveyId)
    .populate("providerId", "companyName companyCode")
    .lean();
  if (!survey) throw new ApiError(404, "Survey not available");

  if (!surveyMatchesMemberProfile(survey, profile)) {
    throw new ApiError(403, "You are not eligible for this survey based on your profile.");
  }

  const now = new Date();
  if (survey.startDate && survey.startDate > now) throw new ApiError(400, "Survey not started yet");
  if (survey.endDate && survey.endDate < now) throw new ApiError(400, "Survey has ended");

  const userOid = new Types.ObjectId(userId);
  const surveyOid = survey._id as Types.ObjectId;

  const alreadyCompleted = await PanelSurveyAttempt.findOne({
    userId: userOid,
    panelSurveyId: surveyOid,
    status: "completed_rewarded"
  }).lean();
  if (alreadyCompleted) {
    throw new ApiError(403, "You already completed this survey.");
  }

  const maxAttempts = Math.min(10, Math.max(1, Number(survey.maxMemberAttempts ?? 2)));
  const attemptsUsed = await PanelSurveyAttempt.countDocuments({
    userId: userOid,
    panelSurveyId: surveyOid
  });
  if (attemptsUsed >= maxAttempts) {
    throw new ApiError(403, "Maximum attempts for this survey have been used.");
  }

  const token = crypto.randomBytes(12).toString("hex");
  const pid = String(survey.supplierProjectPid ?? "").trim();
  if (!pid) throw new ApiError(400, "Survey is missing supplier project id (pid) for tracking");

  await PanelSurveyAttempt.create({
    userId: userOid,
    panelSurveyId: surveyOid,
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
