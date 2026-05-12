import { Router } from "express";
import {
  createSurveyCompany,
  deleteSurveyCompany,
  getSurveyCompany,
  listSurveyCompanies,
  patchSurveyCompanyStatus,
  updateSurveyCompany
} from '../controllers/survey-company.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { ROLES } from '../constants/roles';
import {
  createSurveyCompanySchema,
  listSurveyCompaniesSchema,
  paramsIdSchema,
  surveyCompanyStatusSchema,
  updateSurveyCompanySchema
} from '../validations/survey-company.validation';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER));

router.get("/", validate(listSurveyCompaniesSchema), listSurveyCompanies);
router.post("/", validate(createSurveyCompanySchema), createSurveyCompany);
router.get("/:id", validate(paramsIdSchema), getSurveyCompany);
router.patch("/:id", validate(updateSurveyCompanySchema), updateSurveyCompany);
router.patch("/:id/status", validate(surveyCompanyStatusSchema), patchSurveyCompanyStatus);
router.delete("/:id", validate(paramsIdSchema), deleteSurveyCompany);

export default router;
