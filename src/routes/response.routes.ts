import { Router } from "express";
import { exportResponses, getResponses, submitResponse } from '../controllers/response.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { submitResponseSchema } from '../validations/response.validation';
import { ROLES } from '../constants/roles';

const router = Router();

router.post("/", validate(submitResponseSchema), submitResponse);
router.get("/:surveyId", authenticate, authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER), getResponses);
router.get("/:surveyId/export", authenticate, authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER), exportResponses);

export default router;

