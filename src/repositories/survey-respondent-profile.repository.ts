import { Types } from "mongoose";
import { SurveyRespondentProfile } from "../models/SurveyRespondentProfile";
import type { RespondentSurveyStatus } from "../constants/survey-respondent";

export type RespondentProfileListFilter = {
  vendorId?: string;
  panelSurveyId?: string;
  allocationId?: string;
  surveyStatus?: RespondentSurveyStatus;
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

export const surveyRespondentProfileRepository = {
  findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return SurveyRespondentProfile.findById(id)
      .populate("vendorId", "vendorCode companyName")
      .populate("panelSurveyId", "surveyName surveyCode supplierProjectPid")
      .populate("allocationId", "allocationCode routingSlug")
      .populate("userId", "name email")
      .lean();
  },

  /** Unpopulated document — use before writes / ObjectId extraction */
  findByIdPlain(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return SurveyRespondentProfile.findById(id).lean();
  },

  findByInternalToken(token: string) {
    const t = token.trim();
    if (!t) return null;
    return SurveyRespondentProfile.findOne({ internalSessionToken: t }).lean();
  },

  findByPanelAttemptId(attemptId: Types.ObjectId) {
    return SurveyRespondentProfile.findOne({ panelSurveyAttemptId: attemptId }).lean();
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

    const q: Record<string, unknown> = {};
    if (filter.vendorId && Types.ObjectId.isValid(filter.vendorId)) {
      q.vendorId = new Types.ObjectId(filter.vendorId);
    }
    if (filter.panelSurveyId && Types.ObjectId.isValid(filter.panelSurveyId)) {
      q.panelSurveyId = new Types.ObjectId(filter.panelSurveyId);
    }
    if (filter.allocationId && Types.ObjectId.isValid(filter.allocationId)) {
      q.allocationId = new Types.ObjectId(filter.allocationId);
    }
    if (filter.surveyStatus) q.surveyStatus = filter.surveyStatus;
    if (filter.respondentOwnerType) q.respondentOwnerType = filter.respondentOwnerType;
    if (filter.search?.trim()) {
      const s = filter.search.trim();
      q.$or = [
        { vendorRespondentToid: { $regex: s, $options: "i" } },
        { internalSessionToken: { $regex: s, $options: "i" } }
      ];
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

  cursorForExport(filter: RespondentProfileListFilter, batchSize = 500) {
    const q: Record<string, unknown> = {};
    if (filter.vendorId && Types.ObjectId.isValid(filter.vendorId)) {
      q.vendorId = new Types.ObjectId(filter.vendorId);
    }
    if (filter.panelSurveyId && Types.ObjectId.isValid(filter.panelSurveyId)) {
      q.panelSurveyId = new Types.ObjectId(filter.panelSurveyId);
    }
    if (filter.allocationId && Types.ObjectId.isValid(filter.allocationId)) {
      q.allocationId = new Types.ObjectId(filter.allocationId);
    }
    if (filter.surveyStatus) q.surveyStatus = filter.surveyStatus;
    if (filter.respondentOwnerType) q.respondentOwnerType = filter.respondentOwnerType;
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

    return SurveyRespondentProfile.find(q)
      .sort({ createdAt: -1 })
      .populate("vendorId", "vendorCode companyName")
      .populate("panelSurveyId", "surveyName surveyCode")
      .populate("allocationId", "allocationCode")
      .cursor({ batchSize });
  }
};
