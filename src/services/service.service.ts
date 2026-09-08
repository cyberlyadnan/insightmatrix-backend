import { Service } from "../models/Service";
import { ApiError } from "../utils/ApiError";

const SORT_WHITELIST = ["order", "service_name", "createdAt", "status", "category"] as const;
type SortField = (typeof SORT_WHITELIST)[number];

type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  status?: "published" | "draft" | "all";
  featured?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function isMongoDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

export const serviceService = {
  create: async (payload: Record<string, unknown>) => {
    try {
      const slug = String(payload.slug ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (!slug) throw new ApiError(400, "Valid slug is required");

      const existing = await Service.findOne({ slug });
      if (existing) throw new ApiError(409, "A service with this slug already exists");

      return await Service.create({ ...payload, slug });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (isMongoDuplicateKey(error)) {
        throw new ApiError(409, "A service with this slug already exists");
      }
      throw error;
    }
  },

  list: async (params: ListParams, isPublic = false) => {
    const page = Math.max(1, Number(params.page ?? 1));
    const pageSize = Math.min(500, Math.max(1, Number(params.pageSize ?? 50)));
    const filter: Record<string, unknown> = {};

    if (isPublic) {
      filter.status = "published";
    } else if (params.status && params.status !== "all") {
      filter.status = params.status;
    }

    if (params.category && params.category !== "all") {
      filter.category = params.category;
    }

    if (typeof params.featured === "boolean") {
      filter.featured = params.featured;
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      filter.$or = [
        { service_name: { $regex: q, $options: "i" } },
        { slug: { $regex: q, $options: "i" } },
        { "hero.title": { $regex: q, $options: "i" } },
        { "hero.subtitle": { $regex: q, $options: "i" } },
        { "seo.meta_description": { $regex: q, $options: "i" } },
      ];
    }

    const sortField: SortField = SORT_WHITELIST.includes(params.sortBy as SortField)
      ? (params.sortBy as SortField)
      : "order";
    const order: 1 | -1 = params.sortOrder === "desc" ? -1 : 1;
    const sort = { [sortField]: order, createdAt: -1 } as Record<string, 1 | -1>;

    const [items, total] = await Promise.all([
      Service.find(filter)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Service.countDocuments(filter),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  },

  getByIdOrSlug: async (slugOrId: string) => {
    let doc: Record<string, unknown> | null = null;
    if (/^[0-9a-fA-F]{24}$/.test(slugOrId)) {
      doc = await Service.findById(slugOrId).lean();
    }
    if (!doc) {
      const normalizedSlug = slugOrId.trim().toLowerCase();
      doc = await Service.findOne({ slug: normalizedSlug }).lean();
    }
    if (!doc) throw new ApiError(404, "Service not found");
    return doc;
  },

  updateById: async (id: string, payload: Record<string, unknown>) => {
    try {
      const update = { ...payload };
      if (typeof update.slug === "string") {
        const slug = update.slug
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_-]+/g, "-")
          .replace(/^-+|-+$/g, "");
        if (!slug) throw new ApiError(400, "Valid slug is required");

        const clash = await Service.findOne({ slug, _id: { $ne: id } });
        if (clash) throw new ApiError(409, "A service with this slug already exists");
        update.slug = slug;
      }

      const doc = await Service.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
      }).lean();

      if (!doc) throw new ApiError(404, "Service not found");
      return doc;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (isMongoDuplicateKey(error)) {
        throw new ApiError(409, "A service with this slug already exists");
      }
      throw error;
    }
  },

  setStatus: async (id: string, status: "published" | "draft") => {
    const doc = await Service.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new ApiError(404, "Service not found");
    return doc;
  },

  deleteById: async (id: string) => {
    const doc = await Service.findByIdAndDelete(id).lean();
    if (!doc) throw new ApiError(404, "Service not found");
    return doc;
  },
};
