import { Router } from "express";
import {
  createPanelSurvey,
  deletePanelSurvey,
  getPanelSurvey,
  getPublicPanelSurvey,
  listPanelSurveys,
  patchPanelSurveyStatus,
  updatePanelSurvey
} from '../controllers/panel-survey.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { ROLES } from '../constants/roles';
import {
  createPanelSurveySchema,
  listPanelSurveysSchema,
  paramsIdSchema,
  patchPanelSurveyStatusSchema,
  updatePanelSurveySchema
} from '../validations/panel-survey.validation';

const router = Router();

router.get("/public/:id", validate(paramsIdSchema), getPublicPanelSurvey);

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER));

router.get("/", validate(listPanelSurveysSchema), listPanelSurveys);
router.post("/", validate(createPanelSurveySchema), createPanelSurvey);
router.get("/:id", validate(paramsIdSchema), getPanelSurvey);
router.patch("/:id", validate(updatePanelSurveySchema), updatePanelSurvey);
router.patch("/:id/status", validate(patchPanelSurveyStatusSchema), patchPanelSurveyStatus);
router.delete("/:id", validate(paramsIdSchema), deletePanelSurvey);

export default router;
