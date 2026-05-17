import { Router } from "express";
import { ROLES } from "../constants/roles";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  closeVendorAllocation,
  createVendorAllocation,
  deleteVendorAllocation,
  getVendorAllocation,
  getVendorAllocationAnalytics,
  listVendorAllocations,
  pauseVendorAllocation,
  resumeVendorAllocation,
  updateVendorAllocation
} from "../controllers/vendor-allocation.controller";
import {
  createVendorAllocationSchema,
  listVendorAllocationsSchema,
  updateVendorAllocationSchema,
  vendorAllocationIdParamsSchema
} from "../validations/vendor-allocation.validation";

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER));

router.get("/", validate(listVendorAllocationsSchema), listVendorAllocations);
router.post("/", validate(createVendorAllocationSchema), createVendorAllocation);
router.get("/:id", validate(vendorAllocationIdParamsSchema), getVendorAllocation);
router.get(
  "/:id/analytics",
  validate(vendorAllocationIdParamsSchema),
  getVendorAllocationAnalytics
);
router.patch("/:id", validate(updateVendorAllocationSchema), updateVendorAllocation);
router.post("/:id/pause", validate(vendorAllocationIdParamsSchema), pauseVendorAllocation);
router.post("/:id/resume", validate(vendorAllocationIdParamsSchema), resumeVendorAllocation);
router.post("/:id/close", validate(vendorAllocationIdParamsSchema), closeVendorAllocation);
router.delete("/:id", validate(vendorAllocationIdParamsSchema), deleteVendorAllocation);

export default router;
