import crypto from "node:crypto";
import { ApiError } from "../utils/ApiError";
import { PanelSurveyAttempt } from "../models/PanelSurveyAttempt";
import { validatePanelSurveyForRouting } from "./routing/routing-gateway.service";

/** Public share-link entry — creates a tracked attempt without member login */
export async function createSharedPanelSurveyAttempt(surveyId: string) {
  const validated = await validatePanelSurveyForRouting(surveyId);

  const token = crypto.randomBytes(12).toString("hex");
  const pid = String(validated.supplierProjectPid ?? "").trim();
  if (!pid) {
    throw new ApiError(400, "Survey is missing supplier project id (pid) for tracking");
  }

  await PanelSurveyAttempt.create({
    userId: null,
    panelSurveyId: validated.surveyId,
    token,
    supplierProjectPidSnapshot: pid,
    status: "started"
  });

  return {
    attemptToken: token,
    surveyId: String(validated.surveyId),
    supplierProjectPid: pid
  };
}
