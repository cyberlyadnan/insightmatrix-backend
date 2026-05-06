import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/ApiResponse';
import { userService } from '../services/user.service';
import { toPublicUser } from '../utils/user.dto';

export const listUsers = asyncHandler(async (req, res) => {
  const users = await userService.list();
  sendResponse(res, { data: users.map((u) => toPublicUser(u)) });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.params.id);
  sendResponse(res, { data: toPublicUser(user) });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateById(req.params.id, req.body);
  sendResponse(res, { message: "User updated", data: toPublicUser(user) });
});

export const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteById(req.params.id);
  sendResponse(res, { message: "User deleted" });
});

export const getProfile = asyncHandler(async (req, res) => {
  sendResponse(res, { data: toPublicUser(req.user) });
});

