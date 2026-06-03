import { Router } from "express";
import {
  createPrescreen,
  createPrescreenCategory,
  deletePrescreen,
  duplicatePrescreen,
  getPrescreenById,
  getPrescreenSubmissionStats,
  listPrescreenCategories,
  listPrescreens,
  publishPrescreen,
  reorderPrescreenQuestions,
  seedDefaultPrescreens,
  seedPanelMemberPrescreen,
  setPrescreenRequiredForPanel,
  unpublishPrescreen,
  updatePrescreen
} from '../controllers/prescreen.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { ROLES } from '../constants/roles';
import {
  createCategorySchema,
  createPrescreenSchema,
  listPrescreensSchema,
  paramsIdSchema,
  reorderQuestionsSchema,
  updatePrescreenSchema
} from '../validations/prescreen.validation';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER));

router.get("/", validate(listPrescreensSchema), listPrescreens);
router.post("/seed-defaults", seedDefaultPrescreens);
router.post("/seed-panel-member", seedPanelMemberPrescreen);
router.get("/categories", listPrescreenCategories);
router.post("/categories", validate(createCategorySchema), createPrescreenCategory);
router.post("/", validate(createPrescreenSchema), createPrescreen);
router.get("/:id/submission-stats", validate(paramsIdSchema), getPrescreenSubmissionStats);
router.get("/:id", validate(paramsIdSchema), getPrescreenById);
router.patch("/:id", validate(updatePrescreenSchema), updatePrescreen);
router.delete("/:id", validate(paramsIdSchema), deletePrescreen);
router.patch("/:id/publish", validate(paramsIdSchema), publishPrescreen);
router.patch("/:id/set-required-for-panel", validate(paramsIdSchema), setPrescreenRequiredForPanel);
router.patch("/:id/unpublish", validate(paramsIdSchema), unpublishPrescreen);
router.post("/:id/duplicate", validate(paramsIdSchema), duplicatePrescreen);
router.patch("/:id/reorder-questions", validate(reorderQuestionsSchema), reorderPrescreenQuestions);

export default router;
