import { Router } from "express";
import { getSiteSettings, updateSiteSettings } from "../controllers/site-settings.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { ROLES } from "../constants/roles";
import { updateSiteSettingsSchema } from "../validations/site-settings.validation";

const router = Router();

// Public route to get site profile and company details
router.get("/site-profile", getSiteSettings);
router.get("/", getSiteSettings);

// Admin-only route to update site profile and settings
router.put(
  "/site-profile",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER),
  validate(updateSiteSettingsSchema),
  updateSiteSettings
);

router.put(
  "/",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER),
  validate(updateSiteSettingsSchema),
  updateSiteSettings
);

export default router;
