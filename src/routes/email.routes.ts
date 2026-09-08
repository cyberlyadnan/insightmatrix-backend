import { Router } from "express";
import { ROLES } from "../constants/roles";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { getEmailStatus, postTestEmail } from "../controllers/email.controller";
import { emailStatusSchema, sendTestEmailSchema } from "../validations/email.validation";

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

router.get("/status", validate(emailStatusSchema), getEmailStatus);
router.post("/test", validate(sendTestEmailSchema), postTestEmail);

export default router;
