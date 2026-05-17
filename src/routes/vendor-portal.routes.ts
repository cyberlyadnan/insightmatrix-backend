import { Router } from "express";
import { validate } from "../middleware/validate.middleware";
import {
  authenticateVendor,
  requireActiveVendor
} from "../middleware/vendor-auth.middleware";
import {
  vendorChangePassword,
  vendorDashboardSummary,
  vendorMe,
  vendorUpdateProfile
} from "../controllers/vendor-portal.controller";
import {
  getVendorPortalSurvey,
  listVendorPortalSurveys
} from "../controllers/vendor-portal-allocation.controller";
import {
  listVendorAllocationsSchema,
  vendorPortalAllocationIdParamsSchema
} from "../validations/vendor-allocation.validation";
import {
  vendorChangePasswordSchema,
  vendorUpdateProfileSchema
} from "../validations/vendor-auth.validation";

const router = Router();

router.use(authenticateVendor);
router.use(requireActiveVendor);

router.get("/me", vendorMe);
router.patch("/me", validate(vendorUpdateProfileSchema), vendorUpdateProfile);
router.patch("/me/password", validate(vendorChangePasswordSchema), vendorChangePassword);
router.get("/dashboard", vendorDashboardSummary);
router.get("/surveys", validate(listVendorAllocationsSchema), listVendorPortalSurveys);
router.get(
  "/surveys/:allocationId",
  validate(vendorPortalAllocationIdParamsSchema),
  getVendorPortalSurvey
);

export default router;
