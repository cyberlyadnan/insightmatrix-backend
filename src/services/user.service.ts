import { ApiError } from '../utils/ApiError';
import { userRepository } from '../repositories/user.repository';
import { comparePassword, hashPassword } from '../utils/password';

export const userService = {
  create: (payload) => userRepository.create(payload),
  list: () => userRepository.list(),
  getById: async (id) => {
    const user = await userRepository.findById(id);
    if (!user) throw new ApiError(404, "User not found");
    return user;
  },
  updateById: async (id, payload) => {
    const user = await userRepository.updateById(id, payload);
    if (!user) throw new ApiError(404, "User not found");
    return user;
  },
  updatePassword: async (id, currentPassword: string, newPassword: string) => {
    const user = await userRepository.findByIdWithPassword(id);
    if (!user) throw new ApiError(404, "User not found");
    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) throw new ApiError(400, "Current password is incorrect");
    user.password = await hashPassword(newPassword);
    await user.save();
    return user;
  },
  requestAccountDeletion: async (id: string, reason?: string) => {
    const user = await userRepository.updateById(id, {
      deletionRequested: true,
      deletionRequestedAt: new Date(),
      deletionRequestReason: reason?.trim() || null
    });
    if (!user) throw new ApiError(404, "User not found");
    return user;
  },
  cancelAccountDeletionRequest: async (id: string) => {
    const user = await userRepository.updateById(id, {
      deletionRequested: false,
      deletionRequestedAt: null,
      deletionRequestReason: null
    });
    if (!user) throw new ApiError(404, "User not found");
    return user;
  },
  listDeletionRequests: () => userRepository.listDeletionRequests(),
  approveAccountDeletion: async (id: string) => {
    const user = await userRepository.updateById(id, {
      isActive: false,
      status: "deactivated",
      deactivatedAt: new Date(),
      deletionRequested: false,
      deletionRequestedAt: null,
      deletionRequestReason: null
    });
    if (!user) throw new ApiError(404, "User not found");
    return user;
  },
  deleteById: async (id) => {
    const user = await userRepository.deleteById(id);
    if (!user) throw new ApiError(404, "User not found");
  }
};

