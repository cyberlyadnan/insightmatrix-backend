import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { ROLES } from "../constants/roles";
import {
  getSurveySherpaDefinitions,
  getSurveySherpaQualifications,
  getSurveySherpaRemoteSurveys,
  getSurveySherpaStatus,
  getSurveySherpaSurveyDetails,
  getSurveySherpaSurveyStats,
  importSingleSurvey,
  postSurveySherpaCredentials,
  postSyncAllSurveys
} from "../controllers/surveysherpa.controller";

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER));

router.get("/status", getSurveySherpaStatus);
router.post("/credentials", postSurveySherpaCredentials);
router.get("/definitions", getSurveySherpaDefinitions);
router.get("/qualifications", getSurveySherpaQualifications);
router.get("/surveys", getSurveySherpaRemoteSurveys);
router.get("/surveys/:id", getSurveySherpaSurveyDetails);
router.get("/surveys/:id/stats", getSurveySherpaSurveyStats);
router.post("/surveys/:id/import", importSingleSurvey);
router.post("/sync", postSyncAllSurveys);

export default router;
