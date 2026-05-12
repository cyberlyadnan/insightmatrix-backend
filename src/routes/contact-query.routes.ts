import { Router } from "express";
import {
  deleteContactQuery,
  listContactQueries,
  listContactSubjects,
  submitContactQuery,
  updateContactQuery,
  updateContactQueryStatus
} from '../controllers/contact-query.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  listContactQueriesSchema,
  paramsIdSchema,
  submitContactQuerySchema,
  updateContactQuerySchema,
  updateContactQueryStatusSchema
} from '../validations/contact-query.validation';
import { ROLES } from '../constants/roles';

const router = Router();

router.get("/subjects", listContactSubjects);
router.post("/", validate(submitContactQuerySchema), submitContactQuery);

router.use(authenticate, authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER));
router.get("/", validate(listContactQueriesSchema), listContactQueries);
router.patch("/:id", validate(updateContactQuerySchema), updateContactQuery);
router.patch("/:id/status", validate(updateContactQueryStatusSchema), updateContactQueryStatus);
router.delete("/:id", validate(paramsIdSchema), deleteContactQuery);

export default router;
