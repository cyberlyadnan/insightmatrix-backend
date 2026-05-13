import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { userService } from '../services/user.service';
import { bufferToDataUrl, hasValidCloudinaryConfig, uploadToCloudinary } from '../services/upload.service';
import { enrichAuthUser, toPublicUser } from '../utils/user.dto';
import { getPanelPrescreenBundle, submitPanelPrescreen as persistMemberPanelPrescreen } from '../services/panel-prescreen.service';

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
  const user = await enrichAuthUser(req.user);
  sendResponse(res, { data: user });
});

export const getMemberPanelPrescreenBundle = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const bundle = await getPanelPrescreenBundle(String(userId), req.user?.role);
  sendResponse(res, { data: bundle });
});

export const submitMemberPanelPrescreen = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  await persistMemberPanelPrescreen(
    String(userId),
    req.body.answers as Record<string, unknown>,
    typeof req.body.durationMs === "number" ? req.body.durationMs : undefined
  );
  const user = await enrichAuthUser(req.user);
  sendResponse(res, { message: "Prescreen saved", data: { user } });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const user = await userService.updateById(String(userId), req.body);
  sendResponse(res, { message: "Profile updated", data: await enrichAuthUser(user) });
});

export const uploadProfileAvatar = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  if (!req.file?.buffer) throw new ApiError(400, "Avatar image is required");
  const mimeType = req.file.mimetype || "image/webp";
  let avatarUrl: string | null = null;

  if (hasValidCloudinaryConfig()) {
    try {
      const result = (await uploadToCloudinary(req.file.buffer, "avatars")) as { secure_url?: string };
      avatarUrl = result?.secure_url ?? null;
    } catch (error) {
      if (env.NODE_ENV === "production") throw error;
    }
  }

  if (!avatarUrl) {
    avatarUrl = bufferToDataUrl(req.file.buffer, mimeType);
  }

  const user = await userService.updateById(String(userId), { avatar: avatarUrl });
  sendResponse(res, { message: "Avatar updated", data: await enrichAuthUser(user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  await userService.updatePassword(String(userId), req.body.currentPassword, req.body.newPassword);
  sendResponse(res, { message: "Password updated successfully" });
});

export const requestAccountDeletion = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const user = await userService.requestAccountDeletion(String(userId), req.body.reason);
  sendResponse(res, { message: "Account deletion request submitted", data: await enrichAuthUser(user) });
});

export const cancelAccountDeletionRequest = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const user = await userService.cancelAccountDeletionRequest(String(userId));
  sendResponse(res, { message: "Account deletion request cancelled", data: await enrichAuthUser(user) });
});

export const listDeletionRequests = asyncHandler(async (_req, res) => {
  const users = await userService.listDeletionRequests();
  sendResponse(res, { data: users.map((u) => toPublicUser(u)) });
});

export const approveAccountDeletion = asyncHandler(async (req, res) => {
  const user = await userService.approveAccountDeletion(req.params.id);
  sendResponse(res, { message: "Account deactivated", data: toPublicUser(user) });
});

