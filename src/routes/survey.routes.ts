import { Router } from "express";
import {
  createSurvey,
  deleteSurvey,
  listSurveys,
  publishSurvey,
  surveyAnalytics,
  updateSurvey
} from '../controllers/survey.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createSurveySchema, updateSurveySchema } from '../validations/survey.validation';
import { ROLES } from '../constants/roles';

const router = Router();

router.use(authenticate);
router.get("/", listSurveys);
router.post("/", authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER), validate(createSurveySchema), createSurvey);
router.patch("/:id", authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER), validate(updateSurveySchema), updateSurvey);
router.delete("/:id", authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER), deleteSurvey);
router.patch("/:id/publish", authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER), publishSurvey);
router.get("/:id/analytics", authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER), surveyAnalytics);

export default router;

