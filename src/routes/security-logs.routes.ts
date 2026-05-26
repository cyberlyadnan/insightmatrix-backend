import { Router } from "express";
import { ROLES } from "../constants/roles";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  getSecurityAnalytics,
  listSecurityValidationLogs
} from "../controllers/security-logs.controller";
import { listSecurityLogsSchema, securityAnalyticsSchema } from "../validations/security-logs.validation";

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER));

router.get("/analytics", validate(securityAnalyticsSchema), getSecurityAnalytics);
router.get("/", validate(listSecurityLogsSchema), listSecurityValidationLogs);

export default router;
