import { Router } from "express";
import {
  createCompanySurveyPayment,
  downloadCompanySurveyPaymentInvoice,
  listCompanySurveyPayments,
  patchCompanySurveyPaymentStatus
} from "../controllers/company-survey-payment.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { ROLES } from "../constants/roles";
import {
  companySurveyPaymentIdParamSchema,
  createCompanySurveyPaymentSchema,
  listCompanySurveyPaymentsSchema,
  patchCompanySurveyPaymentStatusSchema
} from "../validations/company-survey-payment.validation";

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER));

router.get("/", validate(listCompanySurveyPaymentsSchema), listCompanySurveyPayments);
router.post("/", validate(createCompanySurveyPaymentSchema), createCompanySurveyPayment);
router.get(
  "/:id/invoice",
  validate(companySurveyPaymentIdParamSchema),
  downloadCompanySurveyPaymentInvoice
);
router.patch(
  "/:id/status",
  validate(patchCompanySurveyPaymentStatusSchema),
  patchCompanySurveyPaymentStatus
);

export default router;
