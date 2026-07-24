import type { Types } from "mongoose";
import { Types as MongooseTypes } from "mongoose";
import { SurveyRespondentProfile } from "../models/SurveyRespondentProfile";
import { PanelSurvey } from "../models/PanelSurvey";
import { escapeRegex } from "../utils/escape-regex";
import type { RespondentSurveyStatus } from "../constants/survey-respondent";

export type RespondentProfileListFilter = {
  vendorId?: string;
  panelSurveyId?: string;
  allocationId?: string;
  surveyStatus?: RespondentSurveyStatus | string;
  respondentOwnerType?: "internal" | "vendor";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

function pageMeta(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { page, pageSize, total, totalPages };
}

async function buildRespondentSearchOr(search: string): Promise<Record<string, unknown>[]> {
  const s = search.trim();
  const regex = { $regex: escapeRegex(s), $options: "i" };
  const conditions: Record<string, unknown>[] = [
    { vendorRespondentToid: regex },
    { internalSessionToken: regex }
  ];

  if (MongooseTypes.ObjectId.isValid(s)) {
    conditions.push({ panelSurveyId: new MongooseTypes.ObjectId(s) });
  }

  const matchingSurveys = await PanelSurvey.find({
    $or: [
      { surveyName: regex },
      { surveyCode: regex },
      { externalSurveyId: regex },
      { supplierProjectPid: regex }
    ]
  })
    .select("_id")
    .lean();

  for (const survey of matchingSurveys) {
    conditions.push({ panelSurveyId: survey._id });
  }

  return conditions;
}

/** Shared match query for list, count, and export — keeps filters consistent. */
export async function buildRespondentMatchQuery(
  filter: RespondentProfileListFilter
): Promise<Record<string, unknown>> {
  const q: Record<string, unknown> = {};

  const vendorId = filter.vendorId?.trim();
  if (vendorId && MongooseTypes.ObjectId.isValid(vendorId)) {
    q.vendorId = new MongooseTypes.ObjectId(vendorId);
  }

  const panelSurveyId = filter.panelSurveyId?.trim();
  if (panelSurveyId && MongooseTypes.ObjectId.isValid(panelSurveyId)) {
    q.panelSurveyId = new MongooseTypes.ObjectId(panelSurveyId);
  }

  const allocationId = filter.allocationId?.trim();
  if (allocationId && MongooseTypes.ObjectId.isValid(allocationId)) {
    q.allocationId = new MongooseTypes.ObjectId(allocationId);
  }

  const surveyStatus = String(filter.surveyStatus ?? "").trim();
  if (surveyStatus) {
    q.surveyStatus = surveyStatus;
  }

  const ownerType = filter.respondentOwnerType?.trim();
  if (ownerType === "internal" || ownerType === "vendor") {
    q.respondentOwnerType = ownerType;
  }

  if (filter.search?.trim()) {
    q.$or = await buildRespondentSearchOr(filter.search);
  }

  const dateFrom = filter.dateFrom?.trim();
  const dateTo = filter.dateTo?.trim();
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};
    if (dateFrom) {
      const start = new Date(dateFrom);
      if (!Number.isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        createdAt.$gte = start;
      }
    }
    if (dateTo) {
      const end = new Date(dateTo);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        createdAt.$lte = end;
      }
    }
    if (Object.keys(createdAt).length > 0) {
      q.createdAt = createdAt;
    }
  }

  return q;
}

export const surveyRespondentProfileRepository = {
  findById(id: string) {
    if (!MongooseTypes.ObjectId.isValid(id)) return null;
    return SurveyRespondentProfile.findById(id)
      .populate("vendorId", "vendorCode companyName")
      .populate("panelSurveyId", "surveyName surveyCode supplierProjectPid")
      .populate("allocationId", "allocationCode routingSlug")
      .populate("userId", "name email")
      .lean();
  },

  /** Unpopulated document — use before writes / ObjectId extraction */
  findByIdPlain(id: string) {
    if (!MongooseTypes.ObjectId.isValid(id)) return null;
    return SurveyRespondentProfile.findById(id).lean();
  },

  findByInternalToken(token: string) {
    const t = token.trim();
    if (!t) return null;
    return SurveyRespondentProfile.findOne({ internalSessionToken: t }).lean();
  },

  /** Match internal token or vendor respondent id echoed on supplier callbacks */
  findByParticipantRef(ref: string) {
    const t = ref.trim();
    if (!t) return null;
    return SurveyRespondentProfile.findOne({
      $or: [{ internalSessionToken: t }, { vendorRespondentToid: t }]
    }).lean();
  },

  findByPanelAttemptId(attemptId: Types.ObjectId) {
    return SurveyRespondentProfile.findOne({ panelSurveyAttemptId: attemptId }).lean();
  },

  updateTrackingParticipantId(id: Types.ObjectId, trackingParticipantId: string) {
    return SurveyRespondentProfile.findByIdAndUpdate(
      id,
      { $set: { vendorRespondentToid: trackingParticipantId.trim().slice(0, 500) } },
      { new: true }
    ).lean();
  },

  create(payload: Record<string, unknown>) {
    return SurveyRespondentProfile.create(payload);
  },

  async appendLifecycle(
    id: Types.ObjectId,
    status: RespondentSurveyStatus,
    extra?: Record<string, unknown>
  ) {
    const note = String(extra?.note ?? status);
    return SurveyRespondentProfile.findByIdAndUpdate(
      id,
      {
        $set: { surveyStatus: status, ...extra },
        $push: { lifecycleHistory: { status, note, at: new Date() } }
      },
      { new: true }
    );
  },

  async list(filter: RespondentProfileListFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
    const skip = (page - 1) * pageSize;
    const q = await buildRespondentMatchQuery(filter);

    const [items, total] = await Promise.all([
      SurveyRespondentProfile.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate("vendorId", "vendorCode companyName")
        .populate("panelSurveyId", "surveyName surveyCode")
        .populate("allocationId", "allocationCode routingSlug")
        .lean(),
      SurveyRespondentProfile.countDocuments(q)
    ]);

    return { items, meta: pageMeta(total, page, pageSize) };
  },

  async countForExport(filter: RespondentProfileListFilter): Promise<number> {
    const q = await buildRespondentMatchQuery(filter);
    return SurveyRespondentProfile.countDocuments(q);
  },

  async cursorForExport(filter: RespondentProfileListFilter, batchSize = 500) {
    const q = await buildRespondentMatchQuery(filter);
    return SurveyRespondentProfile.find(q)
      .sort({ createdAt: -1 })
      .populate("vendorId", "vendorCode companyName")
      .populate("panelSurveyId", "surveyName surveyCode")
      .populate("allocationId", "allocationCode")
      .cursor({ batchSize });
  }
};
