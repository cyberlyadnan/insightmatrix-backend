import { ApiError } from '../utils/ApiError';
import { surveyCompanyRepository, type SurveyCompanyFilter } from '../repositories/survey-company.repository';

const SORT_WHITELIST = [
  "companyName",
  "companyCode",
  "createdAt",
  "providerType",
  "status",
  "contactPersonName"
] as const;

type SortField = (typeof SORT_WHITELIST)[number];

type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "active" | "inactive";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function isMongoDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

export const surveyCompanyService = {
  create: async (payload: Record<string, unknown>) => {
    try {
      const code = String(payload.companyCode ?? "").trim().toUpperCase();
      const existing = await surveyCompanyRepository.findOneByCode(code);
      if (existing) throw new ApiError(409, "A company with this code already exists");
      return surveyCompanyRepository.create({ ...payload, companyCode: code });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (isMongoDuplicateKey(error)) throw new ApiError(409, "A company with this code already exists");
      throw error;
    }
  },

  list: async (params: ListParams) => {
    const page = Math.max(1, Number(params.page ?? 1));
    const pageSize = Math.min(500, Math.max(1, Number(params.pageSize ?? 20)));
    const filter: SurveyCompanyFilter = {};

    if (params.status === "active" || params.status === "inactive") {
      filter.status = params.status;
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      filter.$or = [
        { companyName: { $regex: q, $options: "i" } },
        { companyCode: { $regex: q, $options: "i" } },
        { contactPersonName: { $regex: q, $options: "i" } },
        { companyEmail: { $regex: q, $options: "i" } }
      ];
    }

    const sortField: SortField = SORT_WHITELIST.includes(params.sortBy as SortField)
      ? (params.sortBy as SortField)
      : "createdAt";
    const order: 1 | -1 = params.sortOrder === "asc" ? 1 : -1;
    const sort = { [sortField]: order } as Record<string, 1 | -1>;

    const [items, total] = await Promise.all([
      surveyCompanyRepository.findPaged(filter, sort, (page - 1) * pageSize, pageSize),
      surveyCompanyRepository.count(filter)
    ]);

    return {
      items,
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
    };
  },

  getById: async (id: string) => {
    const doc = await surveyCompanyRepository.findById(id);
    if (!doc) throw new ApiError(404, "Company not found");
    return doc;
  },

  updateById: async (id: string, payload: Record<string, unknown>) => {
    try {
      const update = { ...payload };
      if (typeof update.companyCode === "string") {
        const code = update.companyCode.trim().toUpperCase();
        const clash = await surveyCompanyRepository.findOneByCode(code, id);
        if (clash) throw new ApiError(409, "A company with this code already exists");
        update.companyCode = code;
      }
      const doc = await surveyCompanyRepository.updateById(id, update);
      if (!doc) throw new ApiError(404, "Company not found");
      return doc;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (isMongoDuplicateKey(error)) throw new ApiError(409, "A company with this code already exists");
      throw error;
    }
  },

  setStatus: async (id: string, status: "active" | "inactive") => {
    const doc = await surveyCompanyRepository.updateById(id, { status });
    if (!doc) throw new ApiError(404, "Company not found");
    return doc;
  },

  deleteById: async (id: string) => {
    const doc = await surveyCompanyRepository.deleteById(id);
    if (!doc) throw new ApiError(404, "Company not found");
  }
};
