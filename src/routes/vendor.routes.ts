import { Router } from "express";
import { ROLES } from "../constants/roles";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createVendor,
  deleteVendor,
  getVendor,
  getVendorAnalytics,
  listVendors,
  patchVendorStatus,
  updateVendor
} from "../controllers/vendor.controller";
import {
  createVendorSchema,
  listVendorsSchema,
  updateVendorSchema,
  vendorIdParamsSchema,
  vendorStatusSchema
} from "../validations/vendor.validation";

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER));

router.get("/", validate(listVendorsSchema), listVendors);
router.post("/", validate(createVendorSchema), createVendor);
router.get("/:id", validate(vendorIdParamsSchema), getVendor);
router.get("/:id/analytics", validate(vendorIdParamsSchema), getVendorAnalytics);
router.patch("/:id", validate(updateVendorSchema), updateVendor);
router.patch("/:id/status", validate(vendorStatusSchema), patchVendorStatus);
router.delete("/:id", validate(vendorIdParamsSchema), deleteVendor);

export default router;
