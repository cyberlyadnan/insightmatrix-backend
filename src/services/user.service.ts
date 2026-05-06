import { ApiError } from '../utils/ApiError';
import { userRepository } from '../repositories/user.repository';

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
  deleteById: async (id) => {
    const user = await userRepository.deleteById(id);
    if (!user) throw new ApiError(404, "User not found");
  }
};

