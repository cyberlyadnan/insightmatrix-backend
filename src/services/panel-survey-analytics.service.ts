import { Types } from "mongoose";
import { ApiError } from '../utils/ApiError';
import { PanelSurvey } from '../models/PanelSurvey';
import { PanelSurveyRoutingEvent } from '../models/PanelSurveyRoutingEvent';
import type { PanelRoutingEventType } from '../constants/panel-survey-routing';

function asObjectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid survey id");
  return new Types.ObjectId(id);
}

export async function fetchPanelSurveyAnalyticsReport(surveyId: string) {
  const sid = asObjectId(surveyId);
  const survey = await PanelSurvey.findById(sid).lean();
  if (!survey) throw new ApiError(404, "Survey not found");

  const summaryAgg = await PanelSurveyRoutingEvent.aggregate<{
    _id: PanelRoutingEventType;
    count: number;
  }>([
    { $match: { panelSurveyId: sid } },
    { $group: { _id: "$eventType", count: { $sum: 1 } } }
  ]);

  const summaryMap = Object.fromEntries(summaryAgg.map((r) => [r._id, r.count])) as Record<
    string,
    number
  >;

  const pick = (k: PanelRoutingEventType) => summaryMap[k] ?? 0;

  const lastEvent = await PanelSurveyRoutingEvent.findOne({ panelSurveyId: sid })
    .sort({ createdAt: -1 })
    .select("createdAt")
    .lean();

  const totalEvents = await PanelSurveyRoutingEvent.countDocuments({ panelSurveyId: sid });

  const perGroupAgg = await PanelSurveyRoutingEvent.aggregate<{
    _id: string | null;
    completes: number;
    terminates: number;
    screenouts: number;
    other: number;
  }>([
    { $match: { panelSurveyId: sid, quotaGroupId: { $nin: [null, ""] } } },
    {
      $group: {
        _id: "$quotaGroupId",
        completes: {
          $sum: { $cond: [{ $eq: ["$eventType", "complete"] }, 1, 0] }
        },
        terminates: {
          $sum: { $cond: [{ $eq: ["$eventType", "terminate"] }, 1, 0] }
        },
        screenouts: {
          $sum: { $cond: [{ $eq: ["$eventType", "screenout"] }, 1, 0] }
        },
        other: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$eventType",
                  ["quota_full", "quality_reject", "duplicate"]
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  const groupStatsMap = new Map(
    perGroupAgg.map((r) => [
      r._id ?? "",
      {
        completes: r.completes,
        terminates: r.terminates,
        screenouts: r.screenouts,
        other: r.other
      }
    ])
  );

  type GroupRow = {
    groupId: string;
    groupName: string;
    totalQuota: number;
    remainingQuota: number;
    filledSlots: number;
    completes: number;
    terminates: number;
    screenouts: number;
    otherRoutingEvents: number;
  };

  const quotaGroups: GroupRow[] = (survey.dynamicQuotaGroups ?? []).map((g) => {
    const gid = g._id ? String(g._id) : "";
    const stats = gid ? groupStatsMap.get(gid) : undefined;
    const totalQuota = g.totalQuota ?? 0;
    const remainingQuota = g.remainingQuota ?? 0;
    const filledSlots = Math.max(0, totalQuota - remainingQuota);
    return {
      groupId: gid,
      groupName: g.groupName ?? "",
      totalQuota,
      remainingQuota,
      filledSlots,
      completes: stats?.completes ?? 0,
      terminates: stats?.terminates ?? 0,
      screenouts: stats?.screenouts ?? 0,
      otherRoutingEvents: stats?.other ?? 0
    };
  });

  const surveyLevelOther = pick("quota_full") + pick("quality_reject") + pick("duplicate");

  const recentEvents = await PanelSurveyRoutingEvent.find({ panelSurveyId: sid })
    .sort({ createdAt: -1 })
    .limit(40)
    .select("eventType quotaGroupName supplierParticipantRef createdAt")
    .lean();

  return {
    surveyId: String(survey._id),
    surveyCode: survey.surveyCode,
    surveyName: survey.surveyName,
    summary: {
      completes: pick("complete"),
      terminates: pick("terminate"),
      screenouts: pick("screenout"),
      quotaFull: pick("quota_full"),
      qualityReject: pick("quality_reject"),
      duplicate: pick("duplicate"),
      surveyLevelOther,
      totalEvents,
      lastEventAt: lastEvent?.createdAt ? lastEvent.createdAt.toISOString() : null
    },
    quotaGroups,
    recentEvents: recentEvents.map((e) => ({
      eventType: e.eventType,
      quotaGroupName: e.quotaGroupName ?? "",
      supplierParticipantRef: e.supplierParticipantRef ?? "",
      createdAt: e.createdAt ? e.createdAt.toISOString() : null
    }))
  };
}

export async function recordRoutingEvent(
  surveyId: string,
  payload: {
    eventType: PanelRoutingEventType;
    quotaGroupId?: string | null;
    quotaGroupName?: string | null;
    supplierParticipantRef?: string | null;
    meta?: unknown;
  }
) {
  const sid = asObjectId(surveyId);
  const exists = await PanelSurvey.exists({ _id: sid });
  if (!exists) throw new ApiError(404, "Survey not found");

  let quotaGroupName = String(payload.quotaGroupName ?? "").trim();
  const qgid = payload.quotaGroupId?.trim() || null;

  if (qgid && !quotaGroupName) {
    const survey = await PanelSurvey.findById(sid).select("dynamicQuotaGroups").lean();
    const match = survey?.dynamicQuotaGroups?.find((g) => String(g._id) === qgid);
    if (match) quotaGroupName = match.groupName ?? "";
  }

  const doc = await PanelSurveyRoutingEvent.create({
    panelSurveyId: sid,
    eventType: payload.eventType,
    quotaGroupId: qgid,
    quotaGroupName,
    supplierParticipantRef: String(payload.supplierParticipantRef ?? "").trim().slice(0, 500),
    meta: payload.meta ?? null
  });

  return doc;
}
