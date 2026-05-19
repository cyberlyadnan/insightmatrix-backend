import { Router } from "express";
import { ROLES } from "../constants/roles";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  getVendorRespondentSession,
  listVendorRespondentSessions
} from "../controllers/vendor-respondent-tracking.controller";
import {
  listVendorRespondentSessionsSchema,
  vendorRespondentSessionIdParamsSchema
} from "../validations/vendor-respondent-tracking.validation";

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER));

router.get("/", validate(listVendorRespondentSessionsSchema), listVendorRespondentSessions);
router.get(
  "/:id",
  validate(vendorRespondentSessionIdParamsSchema),
  getVendorRespondentSession
);

export default router;
