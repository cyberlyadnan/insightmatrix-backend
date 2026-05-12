import { User } from '../models/User';

export const userRepository = {
  create: (payload) => User.create(payload),
  findByEmail: (email, withPassword = false) =>
    withPassword ? User.findOne({ email }).select("+password") : User.findOne({ email }),
  findById: (id) => User.findById(id),
  findByIdWithPassword: (id) => User.findById(id).select("+password"),
  updateById: (id, payload) => User.findByIdAndUpdate(id, payload, { new: true }),
  deleteById: (id) => User.findByIdAndDelete(id),
  list: () => User.find().sort({ createdAt: -1 }),
  listDeletionRequests: () => User.find({ deletionRequested: true, isActive: true }).sort({ deletionRequestedAt: -1 })
};

