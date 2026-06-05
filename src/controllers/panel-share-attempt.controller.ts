import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { createSharedPanelSurveyAttempt } from "../services/panel-share-attempt.service";

/** Auto-create a tracked panel attempt when someone opens an admin share link */
export const postSharedPanelSurveyAttempt = asyncHandler(async (req, res) => {
  const result = await createSharedPanelSurveyAttempt(req.body.surveyId);
  const qs = new URLSearchParams();
  qs.set("im_attempt", result.attemptToken);
  const startPath = `/survey/start/${result.surveyId}?${qs.toString()}`;

  sendResponse(res, {
    statusCode: 201,
    message: "Survey session created",
    data: { ...result, startPath }
  });
});
