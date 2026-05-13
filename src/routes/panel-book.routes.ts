import { Router } from "express";
import {
  downloadPanelBookPdf,
  getPanelBookAssetAdmin,
  listPanelBookLeads,
  submitPanelBookLead,
  uploadPanelBookPdf
} from "../controllers/panel-book.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { ROLES } from "../constants/roles";
import { listPanelBookLeadsSchema, submitPanelBookLeadSchema } from "../validations/panel-book.validation";
import { panelBookPdfUpload } from "../services/panel-book-upload.service";

const router = Router();

router.post("/leads", validate(submitPanelBookLeadSchema), submitPanelBookLead);
router.get("/document", downloadPanelBookPdf);

router.use(authenticate, authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER));
router.get("/admin/leads", validate(listPanelBookLeadsSchema), listPanelBookLeads);
router.get("/admin/asset", getPanelBookAssetAdmin);
router.post("/admin/upload", panelBookPdfUpload.single("file"), uploadPanelBookPdf);

export default router;
