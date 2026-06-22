import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { createSharedPanelSurveyAttempt } from "../services/panel-share-attempt.service";

/** Auto-create or update a tracked panel attempt when someone opens an admin share link */
export const postSharedPanelSurveyAttempt = asyncHandler(async (req, res) => {
  const result = await createSharedPanelSurveyAttempt(req.body.surveyId, {
    externalParticipantRef: req.body.externalParticipantRef,
    attemptToken: req.body.attemptToken
  });
  const qs = new URLSearchParams();
  qs.set("im_attempt", result.attemptToken);
  if (result.externalParticipantRef) {
    qs.set(result.participantQueryParam, result.externalParticipantRef);
  }
  const startPath = `/survey/start/${result.surveyId}?${qs.toString()}`;

  sendResponse(res, {
    statusCode: 201,
    message: "Survey session created",
    data: { ...result, startPath }
  });
});
