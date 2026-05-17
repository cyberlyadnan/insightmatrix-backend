import { Router } from "express";
import { validate } from "../middleware/validate.middleware";
import { vendorLogin, vendorLogout, vendorRefresh } from "../controllers/vendor-auth.controller";
import { vendorLoginSchema } from "../validations/vendor-auth.validation";

const router = Router();

router.post("/login", validate(vendorLoginSchema), vendorLogin);
router.post("/refresh-token", vendorRefresh);
router.post("/logout", vendorLogout);

export default router;
