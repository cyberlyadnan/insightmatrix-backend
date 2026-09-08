import type { FilterQuery } from "mongoose";
import { User } from "../models/User";

export type UserFilter = FilterQuery<typeof User>;

export const userRepository = {
  create: (payload: Record<string, unknown>) => User.create(payload),
  findByEmail: (email: string, withPassword = false) =>
    withPassword ? User.findOne({ email }).select("+password") : User.findOne({ email }),
  findById: (id: string) => User.findById(id),
  findByIdWithPassword: (id: string) => User.findById(id).select("+password"),
  updateById: (id: string, payload: Record<string, unknown>) =>
    User.findByIdAndUpdate(id, payload, { new: true }),
  deleteById: (id: string) => User.findByIdAndDelete(id),
  list: () => User.find().sort({ createdAt: -1 }),
  count: (filter: UserFilter) => User.countDocuments(filter),
  findPaged: (filter: UserFilter, sort: Record<string, 1 | -1>, skip: number, limit: number) =>
    User.find(filter).sort(sort).skip(skip).limit(limit),
  listDeletionRequests: () =>
    User.find({ deletionRequested: true, isActive: true }).sort({ deletionRequestedAt: -1 }),
};
