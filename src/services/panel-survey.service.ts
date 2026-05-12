import { ApiError } from '../utils/ApiError';
import { SurveyCompany } from '../models/SurveyCompany';
import { PanelSurvey } from '../models/PanelSurvey';
import { panelSurveyRepository, type PanelSurveyFilter } from '../repositories/panel-survey.repository';
import type { PanelSurveyStatus } from '../constants/panel-survey';

const SORT_FIELDS = [
  "surveyName",
  "surveyCode",
  "createdAt",
  "surveyStatus",
  "incidenceRate",
  "estimatedLOI",
  "remainingQuota",
  "totalQuota"
] as const;

type SortField = (typeof SORT_FIELDS)[number];

type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  providerId?: string;
  country?: string;
  surveyStatus?: PanelSurveyStatus;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function isMongoDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

export const panelSurveyService = {
  create: async (payload: Record<string, unknown>) => {
    const pid = payload.providerId;
    if (pid) {
      const exists = await SurveyCompany.findById(pid);
      if (!exists) throw new ApiError(400, "Provider not found");
    }
    try {
      const created = await panelSurveyRepository.create(payload);
      if (!created) throw new ApiError(500, "Failed to load survey after create");
      return created;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (isMongoDuplicateKey(error)) throw new ApiError(409, "Survey code already exists");
      throw error;
    }
  },

  list: async (params: ListParams) => {
    const page = Math.max(1, Number(params.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize ?? 20)));
    const filter: PanelSurveyFilter = {};

    if (params.providerId) {
      filter.providerId = params.providerId;
    }

    if (params.surveyStatus) {
      filter.surveyStatus = params.surveyStatus;
    }

    if (params.country?.trim()) {
      filter.targetCountries = params.country.trim().toUpperCase();
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      filter.$or = [
        { surveyName: { $regex: q, $options: "i" } },
        { surveyCode: { $regex: q, $options: "i" } },
        { externalSurveyId: { $regex: q, $options: "i" } }
      ];
    }

    const sortField: SortField = SORT_FIELDS.includes(params.sortBy as SortField)
      ? (params.sortBy as SortField)
      : "createdAt";
    const order: 1 | -1 = params.sortOrder === "asc" ? 1 : -1;
    const sort = { [sortField]: order } as Record<string, 1 | -1>;

    const [items, total] = await Promise.all([
      panelSurveyRepository.findPaged(filter, sort, (page - 1) * pageSize, pageSize),
      panelSurveyRepository.count(filter)
    ]);

    return {
      items,
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
    };
  },

  getById: async (id: string, populated = true) => {
    const doc = populated
      ? await panelSurveyRepository.findByIdPopulated(id)
      : await panelSurveyRepository.findById(id);
    if (!doc) throw new ApiError(404, "Survey not found");
    return doc;
  },

  getPublicById: async (id: string) => {
    const doc = await panelSurveyRepository.findByIdPopulated(id);
    if (!doc) throw new ApiError(404, "Survey not found");
    return doc;
  },

  updateById: async (id: string, payload: Record<string, unknown>) => {
    if (payload.providerId) {
      const exists = await SurveyCompany.findById(String(payload.providerId));
      if (!exists) throw new ApiError(400, "Provider not found");
    }
    if (typeof payload.surveyCode === "string") {
      const code = payload.surveyCode.trim().toUpperCase();
      const clash = await PanelSurvey.findOne({
        surveyCode: code,
        _id: { $ne: id }
      });
      if (clash) throw new ApiError(409, "Survey code already exists");
      payload.surveyCode = code;
    }
    try {
      const doc = await panelSurveyRepository.updateById(id, payload);
      if (!doc) throw new ApiError(404, "Survey not found");
      return doc;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (isMongoDuplicateKey(error)) throw new ApiError(409, "Survey code already exists");
      throw error;
    }
  },

  setStatus: async (id: string, surveyStatus: PanelSurveyStatus) => {
    const doc = await panelSurveyRepository.updateById(id, { surveyStatus });
    if (!doc) throw new ApiError(404, "Survey not found");
    return doc;
  },

  deleteById: async (id: string) => {
    const doc = await panelSurveyRepository.deleteById(id);
    if (!doc) throw new ApiError(404, "Survey not found");
  }
};
