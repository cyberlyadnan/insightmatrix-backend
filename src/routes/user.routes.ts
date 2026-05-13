import { Router } from "express";
import {
  approveAccountDeletion,
  cancelAccountDeletionRequest,
  changePassword,
  deleteUser,
  getMemberPanelPrescreenBundle,
  getProfile,
  getUser,
  listDeletionRequests,
  listUsers,
  requestAccountDeletion,
  submitMemberPanelPrescreen,
  updateProfile,
  updateUser,
  uploadProfileAvatar
} from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  changePasswordSchema,
  requestDeletionSchema,
  updateProfileSchema,
  updateUserSchema
} from '../validations/user.validation';
import { submitPanelPrescreenSchema } from '../validations/panel-prescreen.validation';
import { ROLES } from '../constants/roles';
import { upload } from '../services/upload.service';

const router = Router();

router.use(authenticate);
router.get("/profile", getProfile);
router.get("/panel-prescreen", getMemberPanelPrescreenBundle);
router.post("/panel-prescreen/submit", validate(submitPanelPrescreenSchema), submitMemberPanelPrescreen);
router.patch("/profile", validate(updateProfileSchema), updateProfile);
router.post("/profile/avatar", upload.single("avatar"), uploadProfileAvatar);
router.post("/profile/change-password", validate(changePasswordSchema), changePassword);
router.post("/profile/deletion-request", validate(requestDeletionSchema), requestAccountDeletion);
router.delete("/profile/deletion-request", cancelAccountDeletionRequest);
router.get("/deletion-requests", authorize(ROLES.ADMIN), listDeletionRequests);
router.patch("/:id/approve-deletion", authorize(ROLES.ADMIN), approveAccountDeletion);
router.get("/", authorize(ROLES.ADMIN), listUsers);
router.get("/:id", authorize(ROLES.ADMIN), getUser);
router.patch("/:id", authorize(ROLES.ADMIN), validate(updateUserSchema), updateUser);
router.delete("/:id", authorize(ROLES.ADMIN), deleteUser);

export default router;

