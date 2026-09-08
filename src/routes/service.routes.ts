import { Router } from "express";
import {
  createService,
  deleteService,
  getServiceBySlugOrId,
  listAdminServices,
  listPublicServices,
  patchServiceStatus,
  updateService,
} from "../controllers/service.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { ROLES } from "../constants/roles";
import {
  createServiceSchema,
  listServicesSchema,
  serviceParamsSchema,
  toggleServiceStatusSchema,
  updateServiceSchema,
} from "../validations/service.validation";

const router = Router();

// Public routes (accessible to everyone)
router.get("/public", validate(listServicesSchema), listPublicServices);
router.get("/detail/:slugOrId", validate(serviceParamsSchema), getServiceBySlugOrId);

// Admin-only endpoints
router.get(
  "/admin/list",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER),
  validate(listServicesSchema),
  listAdminServices
);

router.post(
  "/",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER),
  validate(createServiceSchema),
  createService
);

router.put(
  "/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER),
  validate(updateServiceSchema),
  updateService
);

router.patch(
  "/:id/status",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER),
  validate(toggleServiceStatusSchema),
  patchServiceStatus
);

router.delete(
  "/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER),
  deleteService
);

// Fallback public routes for list and single
router.get("/", validate(listServicesSchema), listPublicServices);
router.get("/:slugOrId", validate(serviceParamsSchema), getServiceBySlugOrId);

export default router;
