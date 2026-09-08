import { ApiError } from '../utils/ApiError';
import { escapeRegex } from '../utils/escape-regex';
import { logger } from '../config/logger';
import { SurveyCompany } from '../models/SurveyCompany';
import { PanelSurvey } from '../models/PanelSurvey';
import { panelSurveyRepository, type PanelSurveyFilter } from '../repositories/panel-survey.repository';
import type { PanelSurveyAudience, PanelSurveyStatus } from '../constants/panel-survey';
import {
  extractSupplierProjectPidFromUrl,
  inferTrackingParameterFromUrl,
  normalizeMalformedSupplierUrl
} from '../utils/supplier-survey-url';
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
  surveyAudience?: PanelSurveyAudience;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function isMongoDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

async function assertUniqueSurveyFields(
  fields: { surveyName?: string; surveyCode?: string; externalSurveyId?: string },
  excludeId?: string
) {
  const exclude = excludeId ? { _id: { $ne: excludeId } } : {};

  if (fields.surveyCode?.trim()) {
    const code = fields.surveyCode.trim().toUpperCase();
    const clash = await PanelSurvey.findOne({ surveyCode: code, ...exclude });
    if (clash) throw new ApiError(409, "Survey code already exists");
  }

  if (fields.surveyName?.trim()) {
    const name = fields.surveyName.trim();
    const clash = await PanelSurvey.findOne({
      surveyName: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
      ...exclude
    });
    if (clash) throw new ApiError(409, "Survey name already exists");
  }

  const externalId = fields.externalSurveyId?.trim();
  if (externalId) {
    const clash = await PanelSurvey.findOne({
      externalSurveyId: { $regex: `^${escapeRegex(externalId)}$`, $options: "i" },
      ...exclude
    });
    if (clash) throw new ApiError(409, "External survey ID already exists");
  }
}

function normalizeParticipantQueryParam(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "toid";
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

function resolveTrackingParameterName(
  payload: Record<string, unknown>,
  entryUrl: string
): string {
  const explicit =
    payload.trackingParameterName !== undefined
      ? String(payload.trackingParameterName ?? "").trim()
      : "";
  const inferred = inferTrackingParameterFromUrl(entryUrl);
  if (inferred && (!explicit || explicit === "toid")) {
    return inferred;
  }
  return normalizeTrackingParameterName(explicit || inferred);
}

function prepareExternalSurveyUrl(entryUrl: string): string {
  return normalizeMalformedSupplierUrl(entryUrl);
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
    const entryUrl = prepareExternalSurveyUrl(String(payload.externalSurveyUrl ?? "").trim());
    payload.externalSurveyUrl = entryUrl;
    payload.trackingParameterName = resolveTrackingParameterName(payload, entryUrl);
    payload.supplierProjectPid = resolveSupplierProjectPid(payload, entryUrl);
    await assertUniqueSurveyFields({
      surveyName: String(payload.surveyName ?? ""),
      surveyCode: String(payload.surveyCode ?? ""),
      externalSurveyId: String(payload.externalSurveyId ?? "")
    });
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
      if (isMongoDuplicateKey(error)) {
        throw new ApiError(409, "Survey code already exists");
      }
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

    if (params.surveyAudience) {
      filter.surveyAudience = params.surveyAudience;
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
      payload.surveyCode = payload.surveyCode.trim().toUpperCase();
    }
    await assertUniqueSurveyFields(
      {
        surveyName:
          payload.surveyName !== undefined ? String(payload.surveyName ?? "") : undefined,
        surveyCode:
          payload.surveyCode !== undefined ? String(payload.surveyCode ?? "") : undefined,
        externalSurveyId:
          payload.externalSurveyId !== undefined
            ? String(payload.externalSurveyId ?? "")
            : undefined
      },
      id
    );
    if (payload.participantQueryParam !== undefined) {
      payload.participantQueryParam = normalizeParticipantQueryParam(payload.participantQueryParam);
    }
    if (payload.externalSurveyUrl !== undefined || payload.supplierProjectPid !== undefined) {
      const current = await panelSurveyRepository.findById(id);
      if (!current) throw new ApiError(404, "Survey not found");
      const mergedUrl =
        payload.externalSurveyUrl !== undefined
          ? prepareExternalSurveyUrl(String(payload.externalSurveyUrl).trim())
          : current.externalSurveyUrl;
      if (payload.externalSurveyUrl !== undefined) {
        payload.externalSurveyUrl = mergedUrl;
      }
      if (payload.trackingParameterName !== undefined || payload.externalSurveyUrl !== undefined) {
        payload.trackingParameterName = resolveTrackingParameterName(
          {
            trackingParameterName:
              payload.trackingParameterName !== undefined
                ? payload.trackingParameterName
                : current.trackingParameterName
          },
          mergedUrl
        );
      }
      payload.supplierProjectPid = resolveSupplierProjectPid(payload, mergedUrl);
    } else if (payload.trackingParameterName !== undefined) {
      payload.trackingParameterName = normalizeTrackingParameterName(payload.trackingParameterName);
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
