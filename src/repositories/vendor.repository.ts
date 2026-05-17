import type { FilterQuery } from "mongoose";
import { Vendor } from "../models/Vendor";

export type VendorFilter = FilterQuery<typeof Vendor>;

export const vendorRepository = {
  create: (payload: Record<string, unknown>) => Vendor.create(payload),

  findById: (id: string, includePassword = false) => {
    const q = Vendor.findById(id);
    if (includePassword) return q.select("+passwordHash");
    return q;
  },

  findByEmail: (email: string, includePassword = false) => {
    const q = Vendor.findOne({ email: email.trim().toLowerCase() });
    if (includePassword) return q.select("+passwordHash");
    return q;
  },

  updateById: (id: string, payload: Record<string, unknown>) =>
    Vendor.findByIdAndUpdate(id, payload, { new: true, runValidators: true }),

  setPasswordHash: (id: string, passwordHash: string) =>
    Vendor.findByIdAndUpdate(id, { $set: { passwordHash } }, { new: true }),

  deleteById: (id: string) => Vendor.findByIdAndDelete(id),

  count: (filter: VendorFilter) => Vendor.countDocuments(filter),

  findPaged: (filter: VendorFilter, sort: Record<string, 1 | -1>, skip: number, limit: number) =>
    Vendor.find(filter).sort(sort).skip(skip).limit(limit)
};
