import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { SurveyCompany } from '../models/SurveyCompany';
import { PanelSurvey } from '../models/PanelSurvey';
import { panelSurveyRepository, type PanelSurveyFilter } from '../repositories/panel-survey.repository';
import type { PanelSurveyStatus } from '../constants/panel-survey';
import { extractSupplierProjectPidFromUrl } from '../utils/supplier-survey-url';
import { companySurveyPaymentService } from './company-survey-payment.service';

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

function normalizeParticipantQueryParam(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "pid";
  if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(s)) {
    throw new ApiError(
      400,
      "participantQueryParam must start with a letter and use only letters, numbers, hyphen, or underscore"
    );
  }
  return s;
}

function normalizeTrackingParameterName(v: unknown): string {
  const s = String(v ?? "").trim();
  return s || "toid";
}

/** Non-empty explicit override wins; otherwise parse `pid` from partner survey URL */
function resolveSupplierProjectPid(
  payload: Record<string, unknown>,
  mergedExternalUrl: string
): string {
  const explicit =
    payload.supplierProjectPid !== undefined ? String(payload.supplierProjectPid ?? "").trim() : "";
  if (explicit.length > 0) return explicit.slice(0, 200);
  return (extractSupplierProjectPidFromUrl(mergedExternalUrl) ?? "").slice(0, 200);
}

export const panelSurveyService = {
  create: async (payload: Record<string, unknown>) => {
    const pid = payload.providerId;
    if (pid) {
      const exists = await SurveyCompany.findById(pid);
      if (!exists) throw new ApiError(400, "Provider not found");
    }
    payload.participantQueryParam = normalizeParticipantQueryParam(payload.participantQueryParam);
    payload.trackingParameterName = normalizeTrackingParameterName(payload.trackingParameterName);
    const entryUrl = String(payload.externalSurveyUrl ?? "").trim();
    payload.supplierProjectPid = resolveSupplierProjectPid(payload, entryUrl);
    try {
      const created = await panelSurveyRepository.create(payload);
      if (!created) throw new ApiError(500, "Failed to load survey after create");
      try {
        const plain = created.toObject?.() ?? created;
        await companySurveyPaymentService.createAutoFromPanelSurvey(plain as never);
      } catch (payErr) {
        logger.error("Failed to auto-create company payment / invoice for new survey", {
          surveyId: String(created._id),
          err: payErr instanceof Error ? payErr.message : payErr
        });
      }
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
        { externalSurveyId: { $regex: q, $options: "i" } },
        { supplierProjectPid: { $regex: q, $options: "i" } }
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

  /** Resolve routing survey by supplier callback project id (`pid`) */
  getBySupplierProjectPid: async (supplierProjectPid: string) => {
    const t = supplierProjectPid.trim();
    if (!t) throw new ApiError(400, "supplierProjectPid required");
    const doc = await PanelSurvey.findOne({ supplierProjectPid: t });
    if (!doc) throw new ApiError(404, "Survey not found");
    return doc;
  },

  getPublicById: async (id: string) => {
    const doc = await panelSurveyRepository.findByIdPopulated(id);
    if (!doc) throw new ApiError(404, "Survey not found");
    const plain = doc.toObject?.() ?? doc;
    if (plain.surveyStatus !== "active") {
      throw new ApiError(404, "Survey not available");
    }
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
    if (payload.participantQueryParam !== undefined) {
      payload.participantQueryParam = normalizeParticipantQueryParam(payload.participantQueryParam);
    }
    if (payload.trackingParameterName !== undefined) {
      payload.trackingParameterName = normalizeTrackingParameterName(payload.trackingParameterName);
    }
    if (payload.externalSurveyUrl !== undefined || payload.supplierProjectPid !== undefined) {
      const current = await panelSurveyRepository.findById(id);
      if (!current) throw new ApiError(404, "Survey not found");
      const mergedUrl =
        payload.externalSurveyUrl !== undefined
          ? String(payload.externalSurveyUrl).trim()
          : current.externalSurveyUrl;
      payload.supplierProjectPid = resolveSupplierProjectPid(payload, mergedUrl);
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
