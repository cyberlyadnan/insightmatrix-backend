import { ApiError } from '../utils/ApiError';
import { ContactQuery } from '../models/ContactQuery';

type ListParams = {
  status?: string;
  subject?: string;
  starred?: boolean;
  archived?: boolean;
  label?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export const contactQueryService = {
  create: (payload: Record<string, unknown>) => ContactQuery.create(payload),
  list: async (params: ListParams) => {
    const page = Math.max(1, Number(params.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize ?? 20)));
    const filter: Record<string, unknown> = {};
    if (params.status) filter.status = params.status;
    if (params.subject) filter.subject = params.subject;
    if (typeof params.starred === "boolean") filter.starred = params.starred;
    if (typeof params.archived === "boolean") {
      filter.archived = params.archived ? true : { $ne: true };
    }
    if (params.label) filter.labels = params.label;
    if (params.search) {
      filter.$or = [
        { name: { $regex: params.search, $options: "i" } },
        { email: { $regex: params.search, $options: "i" } },
        { message: { $regex: params.search, $options: "i" } }
      ];
    }

    const [items, total] = await Promise.all([
      ContactQuery.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize),
      ContactQuery.countDocuments(filter)
    ]);
    return {
      items,
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
    };
  },
  updateStatus: async (
    id: string,
    status: "pending" | "in_progress" | "resolved" | "completed" | "unread" | "read"
  ) => {
    const item = await ContactQuery.findByIdAndUpdate(id, { status }, { new: true });
    if (!item) throw new ApiError(404, "Query not found");
    return item;
  },
  updateById: async (
    id: string,
    payload: { starred?: boolean; archived?: boolean; labels?: string[] }
  ) => {
    const item = await ContactQuery.findByIdAndUpdate(id, payload, { new: true });
    if (!item) throw new ApiError(404, "Query not found");
    return item;
  },
  deleteById: async (id: string) => {
    const item = await ContactQuery.findByIdAndDelete(id);
    if (!item) throw new ApiError(404, "Query not found");
  }
};
