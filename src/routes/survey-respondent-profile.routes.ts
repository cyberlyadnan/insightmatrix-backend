import { Router } from "express";
import { ROLES } from "../constants/roles";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  exportSurveyRespondents,
  getRespondentAnalytics,
  getSurveyRespondentProfile,
  listSurveyRespondentProfiles
} from "../controllers/survey-respondent-profile.controller";
import {
  exportRespondentsSchema,
  listSurveyRespondentProfilesSchema,
  respondentAnalyticsSchema,
  surveyRespondentProfileIdParamsSchema
} from "../validations/survey-respondent-profile.validation";

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER));

router.get("/analytics/summary", validate(respondentAnalyticsSchema), getRespondentAnalytics);
router.post("/export", validate(exportRespondentsSchema), exportSurveyRespondents);
router.get("/", validate(listSurveyRespondentProfilesSchema), listSurveyRespondentProfiles);
router.get(
  "/:id",
  validate(surveyRespondentProfileIdParamsSchema),
  getSurveyRespondentProfile
);

export default router;
