import type { FilterQuery } from "mongoose";
import { PrescreenForm } from '../../models/PrescreenForm';

export type PrescreenListQuery = {
  page?: number;
  pageSize?: number;
  status?: string;
  category?: string;
  search?: string;
};

export function buildPrescreenListQuery(query: PrescreenListQuery) {
  const page = Math.max(1, Number(query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 10)));
  const filter: FilterQuery<unknown> = {};

  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
      { tags: { $elemMatch: { $regex: query.search, $options: "i" } } }
    ];
  }

  return { page, pageSize, filter };
}

export async function paginatePrescreens(query: PrescreenListQuery) {
  const { page, pageSize, filter } = buildPrescreenListQuery(query);
  const [items, total] = await Promise.all([
    PrescreenForm.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("category", "name slug"),
    PrescreenForm.countDocuments(filter)
  ]);

  return {
    items,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  };
}
