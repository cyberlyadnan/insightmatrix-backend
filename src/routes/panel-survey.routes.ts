import { Router } from "express";
import {
  createPanelSurvey,
  deletePanelSurvey,
  getPanelSurvey,
  getPanelSurveyAnalytics,
  getPublicPanelSurvey,
  listPanelSurveys,
  patchPanelSurveyStatus,
  postPanelSurveyRoutingEvent,
  seedDemoPanelSurveys,
  updatePanelSurvey
} from '../controllers/panel-survey.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { ROLES } from '../constants/roles';
import {
  createPanelSurveySchema,
  listPanelSurveysSchema,
  panelSurveyRoutingEventSchema,
  paramsIdSchema,
  patchPanelSurveyStatusSchema,
  updatePanelSurveySchema
} from '../validations/panel-survey.validation';
import {
  getPanelSurveyVendorAllocations,
  getPanelSurveyVendorAllocationSummary
} from '../controllers/vendor-allocation.controller';
import { panelSurveyIdAllocationsParamsSchema } from '../validations/vendor-allocation.validation';

const router = Router();

router.get("/public/:id", validate(paramsIdSchema), getPublicPanelSurvey);

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER));

router.get("/", validate(listPanelSurveysSchema), listPanelSurveys);
router.post("/seed", seedDemoPanelSurveys);
router.post("/", validate(createPanelSurveySchema), createPanelSurvey);
router.get("/:id/analytics", validate(paramsIdSchema), getPanelSurveyAnalytics);
router.get(
  "/:surveyId/vendor-allocations",
  validate(panelSurveyIdAllocationsParamsSchema),
  getPanelSurveyVendorAllocations
);
router.get(
  "/:surveyId/vendor-allocations/summary",
  validate(panelSurveyIdAllocationsParamsSchema),
  getPanelSurveyVendorAllocationSummary
);
router.post(
  "/:id/analytics/events",
  validate(panelSurveyRoutingEventSchema),
  postPanelSurveyRoutingEvent
);
router.get("/:id", validate(paramsIdSchema), getPanelSurvey);
router.patch("/:id", validate(updatePanelSurveySchema), updatePanelSurvey);
router.patch("/:id/status", validate(patchPanelSurveyStatusSchema), patchPanelSurveyStatus);
router.delete("/:id", validate(paramsIdSchema), deletePanelSurvey);

export default router;
