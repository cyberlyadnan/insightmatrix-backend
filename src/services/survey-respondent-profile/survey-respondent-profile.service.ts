import { Types } from "mongoose";
import { ApiError } from "../../utils/ApiError";
import { ROUTING_EVENT_TO_SESSION_STATUS } from "../../constants/vendor-allocation";
import type { PanelRoutingEventType } from "../../constants/panel-survey-routing";
import type { RespondentSurveyStatus } from "../../constants/survey-respondent";
import { surveyRespondentProfileRepository } from "../../repositories/survey-respondent-profile.repository";
import {
  getUniversalRoutingPrescreenForm,
  validateUniversalPrescreenAnswers,
  persistRoutingPrescreenSubmission
} from "../prescreen/universal-prescreen.service";
import { toSurveyRespondentProfileDto } from "../../utils/survey-respondent-profile.dto";
import { toObjectId } from "../../utils/object-id";
import type { RespondentProfileListFilter } from "../../repositories/survey-respondent-profile.repository";

const TERMINAL: RespondentSurveyStatus[] = [
  "complete",
  "terminate",
  "quota_full",
  "quality_reject"
];

export const surveyRespondentProfileService = {
  async list(filter: RespondentProfileListFilter) {
    const result = await surveyRespondentProfileRepository.list(filter);
    return {
      items: result.items.map((d) => toSurveyRespondentProfileDto(d as Record<string, unknown>)),
      meta: result.meta
    };
  },

  async getById(id: string) {
    const doc = await surveyRespondentProfileRepository.findById(id);
    if (!doc) return null;
    const profile = toSurveyRespondentProfileDto(doc as Record<string, unknown>);

    let webhookLogs: unknown[] = [];
    if (profile.vendorRespondentSessionId) {
      const { WebhookDeliveryLog } = await import("../../models/WebhookDeliveryLog");
      webhookLogs = await WebhookDeliveryLog.find({
        sessionId: new Types.ObjectId(profile.vendorRespondentSessionId)
      })
        .sort({ attemptedAt: -1 })
        .limit(20)
        .lean();
    }

    return { profile, webhookLogs };
  },

  async createForVendorSession(input: {
    panelSurveyId: Types.ObjectId;
    allocationId: Types.ObjectId;
    vendorId: Types.ObjectId;
    vendorRespondentSessionId: Types.ObjectId;
    vendorRespondentToid: string;
    internalSessionToken: string;
    trafficSource?: string;
    sourceIp?: string;
  }) {
    const prescreen = await getUniversalRoutingPrescreenForm();
    const doc = await surveyRespondentProfileRepository.create({
      panelSurveyId: input.panelSurveyId,
      allocationId: input.allocationId,
      vendorId: input.vendorId,
      vendorRespondentSessionId: input.vendorRespondentSessionId,
      respondentOwnerType: "vendor",
      vendorRespondentToid: input.vendorRespondentToid,
      internalSessionToken: input.internalSessionToken,
      prescreenFormId: prescreen.form?._id ?? null,
      surveyStatus: prescreen.configured ? "prescreen_pending" : "started",
      trafficSource: input.trafficSource ?? "",
      sourceIp: input.sourceIp ?? "",
      lifecycleHistory: [
        {
          status: prescreen.configured ? "prescreen_pending" : "started",
          note: "Vendor session created",
          at: new Date()
        }
      ]
    });
    return doc;
  },

  async createForPanelAttempt(input: {
    panelSurveyId: Types.ObjectId;
    panelSurveyAttemptId: Types.ObjectId;
    userId: Types.ObjectId;
    internalSessionToken: string;
  }) {
    const existing = await surveyRespondentProfileRepository.findByPanelAttemptId(
      input.panelSurveyAttemptId
    );
    if (existing) return existing;

    const prescreen = await getUniversalRoutingPrescreenForm();
    const doc = await surveyRespondentProfileRepository.create({
      panelSurveyId: input.panelSurveyId,
      panelSurveyAttemptId: input.panelSurveyAttemptId,
      userId: input.userId,
      respondentOwnerType: "internal",
      internalSessionToken: input.internalSessionToken,
      prescreenFormId: prescreen.form?._id ?? null,
      surveyStatus: prescreen.configured ? "prescreen_pending" : "started",
      lifecycleHistory: [
        {
          status: prescreen.configured ? "prescreen_pending" : "started",
          note: "Panel attempt session created",
          at: new Date()
        }
      ]
    });
    return doc;
  },

  async applyOutcomeFromRoutingEvent(
    internalToken: string,
    eventType: PanelRoutingEventType
  ) {
    const sessionStatus = ROUTING_EVENT_TO_SESSION_STATUS[eventType];
    if (!sessionStatus) return;

    const profile = await surveyRespondentProfileRepository.findByInternalToken(internalToken);
    if (!profile) return;
    if (TERMINAL.includes(profile.surveyStatus as RespondentSurveyStatus)) return;

    await surveyRespondentProfileRepository.appendLifecycle(
      profile._id as Types.ObjectId,
      sessionStatus as RespondentSurveyStatus,
      {
        completedAt: new Date(),
        note: `Supplier callback: ${eventType}`
      }
    );
  },

  async getAnalyticsSummary(filter: RespondentProfileListFilter) {
    const q: Record<string, unknown> = {};
    if (filter.vendorId && Types.ObjectId.isValid(filter.vendorId)) {
      q.vendorId = new Types.ObjectId(filter.vendorId);
    }
    if (filter.panelSurveyId && Types.ObjectId.isValid(filter.panelSurveyId)) {
      q.panelSurveyId = new Types.ObjectId(filter.panelSurveyId);
    }
    if (filter.dateFrom || filter.dateTo) {
      q.createdAt = {};
      if (filter.dateFrom) {
        (q.createdAt as Record<string, Date>).$gte = new Date(filter.dateFrom);
      }
      if (filter.dateTo) {
        const end = new Date(filter.dateTo);
        end.setHours(23, 59, 59, 999);
        (q.createdAt as Record<string, Date>).$lte = end;
      }
    }

    const agg = await surveyRespondentProfileRepository.list({
      ...filter,
      pageSize: 1
    });

    const { SurveyRespondentProfile } = await import("../../models/SurveyRespondentProfile");
    const stats = await SurveyRespondentProfile.aggregate([
      { $match: q },
      {
        $group: {
          _id: "$surveyStatus",
          count: { $sum: 1 }
        }
      }
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of stats) {
      byStatus[String(row._id)] = row.count;
    }

    const completes = byStatus.complete ?? 0;
    const terminates = byStatus.terminate ?? 0;
    const quotaFull = byStatus.quota_full ?? 0;
    const qualityRejects = byStatus.quality_reject ?? 0;
    const redirected = byStatus.redirected ?? 0;
    const total = agg.meta.total;

    const conversionDenom = completes + terminates + quotaFull + qualityRejects;
    const conversionRate = conversionDenom > 0 ? completes / conversionDenom : 0;

    return {
      total,
      completes,
      terminates,
      quotaFull,
      qualityRejects,
      redirected,
      prescreenPending: byStatus.prescreen_pending ?? 0,
      conversionRate: Math.round(conversionRate * 10000) / 100,
      byStatus
    };
  },

  async savePrescreenAndAdvance(input: {
    profileId: string;
    internalSessionToken: string;
    answers: Record<string, unknown>;
    durationMs?: number | null;
  }) {
    if (!Types.ObjectId.isValid(input.profileId)) {
      throw new ApiError(400, "Invalid profile id");
    }

    const profile = await surveyRespondentProfileRepository.findByIdPlain(input.profileId);
    if (!profile) throw new ApiError(404, "Respondent profile not found");

    const token = String(profile.internalSessionToken ?? "");
    if (token !== input.internalSessionToken.trim()) {
      throw new ApiError(403, "Invalid session token for profile");
    }

    if (profile.prescreenCompletedAt) {
      return { profile, alreadyCompleted: true };
    }

    const { form, normalized } = await validateUniversalPrescreenAnswers(input.answers);
    const profileOid = new Types.ObjectId(input.profileId);

    await persistRoutingPrescreenSubmission({
      profileId: profileOid,
      formId: form._id as Types.ObjectId,
      answers: normalized,
      durationMs: input.durationMs,
      respondentOwnerType: profile.respondentOwnerType as "internal" | "vendor",
      vendorRespondentToid: String(profile.vendorRespondentToid ?? ""),
      userId: toObjectId(profile.userId)
    });

    const updated = await surveyRespondentProfileRepository.appendLifecycle(
      profileOid,
      "started",
      {
        prescreenAnswers: normalized,
        prescreenCompletedAt: new Date(),
        prescreenDurationMs: input.durationMs ?? null,
        prescreenFormId: form._id,
        note: "Prescreen completed"
      }
    );

    return { profile: updated, alreadyCompleted: false };
  }
};
