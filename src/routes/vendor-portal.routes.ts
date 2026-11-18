import { Router } from "express";
import { validate } from "../middleware/validate.middleware";
import {
  authenticateVendor,
  requireActiveVendor
} from "../middleware/vendor-auth.middleware";
import {
  vendorApiTrafficReport,
  vendorChangePassword,
  vendorDashboardSummary,
  vendorHourlyReport,
  vendorLiveInventory,
  vendorMe,
  vendorUpdateProfile
} from "../controllers/vendor-portal.controller";
import {
  acceptVendorPortalSurvey,
  getVendorPortalSurvey,
  listVendorPortalSurveys,
  rejectVendorPortalSurvey
} from "../controllers/vendor-portal-allocation.controller";
import {
  listVendorAllocationsSchema,
  vendorApiTrafficReportQuerySchema,
  vendorDashboardQuerySchema,
  vendorHourlyReportQuerySchema,
  vendorLiveInventoryQuerySchema,
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
router.get("/dashboard", validate(vendorDashboardQuerySchema), vendorDashboardSummary);
router.get("/reports/hourly", validate(vendorHourlyReportQuerySchema), vendorHourlyReport);
router.get("/reports/traffic", validate(vendorApiTrafficReportQuerySchema), vendorApiTrafficReport);
router.get("/inventory/live", validate(vendorLiveInventoryQuerySchema), vendorLiveInventory);
router.get("/surveys", validate(listVendorAllocationsSchema), listVendorPortalSurveys);
router.get(
  "/surveys/:allocationId",
  validate(vendorPortalAllocationIdParamsSchema),
  getVendorPortalSurvey
);
router.post(
  "/surveys/:allocationId/accept",
  validate(vendorPortalAllocationIdParamsSchema),
  acceptVendorPortalSurvey
);
router.post(
  "/surveys/:allocationId/reject",
  validate(vendorPortalAllocationIdParamsSchema),
  rejectVendorPortalSurvey
);

export default router;
