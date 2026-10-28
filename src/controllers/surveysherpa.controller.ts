import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { surveySherpaService } from "../services/providers/surveysherpa.service";
import { surveySherpaSyncService } from "../services/providers/surveysherpa-sync.service";

/**
 * Check connection status and API key validity
 */
export const getSurveySherpaStatus = asyncHandler(async (_req, res) => {
  const status = await surveySherpaService.testConnection();
  sendResponse(res, {
    statusCode: 200,
    message: status.message,
    data: {
      ...status,
      baseUrl: surveySherpaService.getBaseUrl(),
      hasKeyConfigured: Boolean(surveySherpaService.getAccessKey())
    }
  });
});

/**
 * Update runtime SurveySherpa credentials (e.g. admin setting new access key)
 */
export const postSurveySherpaCredentials = asyncHandler(async (req, res) => {
  const { accessKey, baseUrl } = req.body;
  if (!accessKey || typeof accessKey !== "string") {
    throw new ApiError(400, "accessKey is required");
  }

  surveySherpaService.setCredentials(accessKey.trim(), baseUrl?.trim());
  const status = await surveySherpaService.testConnection();

  sendResponse(res, {
    statusCode: 200,
    message: "Credentials updated",
    data: status
  });
});

/**
 * Get available languages
 */
export const getSurveySherpaDefinitions = asyncHandler(async (_req, res) => {
  const languages = await surveySherpaService.getDefinitions();
  sendResponse(res, {
    statusCode: 200,
    message: "Languages retrieved",
    data: languages
  });
});

/**
 * Get qualifications by language
 */
export const getSurveySherpaQualifications = asyncHandler(async (req, res) => {
  const langId = Number(req.query.lang_id) || 1;
  const qualifications = await surveySherpaService.getQualifications(langId);
  sendResponse(res, {
    statusCode: 200,
    message: "Qualifications retrieved",
    data: qualifications
  });
});

/**
 * Get remote surveys with local import status
 */
export const getSurveySherpaRemoteSurveys = asyncHandler(async (_req, res) => {
  try {
    const data = await surveySherpaSyncService.getRemoteSurveysWithLocalStatus();
    sendResponse(res, {
      statusCode: 200,
      message: "Surveys retrieved",
      data
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("invalid access key")) {
      return sendResponse(res, {
        statusCode: 200,
        message: "Invalid access key - please update in settings",
        data: {
          surveys: [],
          languages: [],
          requiresValidKey: true
        }
      });
    }
    throw err;
  }
});

/**
 * Get survey details + qualifications
 */
export const getSurveySherpaSurveyDetails = asyncHandler(async (req, res) => {
  const surveyId = Number(req.params.id);
  if (!surveyId) throw new ApiError(400, "Valid survey ID is required");

  const details = await surveySherpaService.getSurveyDetails(surveyId);
  if (!details) throw new ApiError(404, "Survey details not found");

  sendResponse(res, {
    statusCode: 200,
    message: "Survey details retrieved",
    data: details
  });
});

/**
 * Get real-time stats from SurveySherpa
 */
export const getSurveySherpaSurveyStats = asyncHandler(async (req, res) => {
  const surveyId = Number(req.params.id);
  if (!surveyId) throw new ApiError(400, "Valid survey ID is required");

  const syncResult = await surveySherpaSyncService.syncSurveyStats(surveyId);
  sendResponse(res, {
    statusCode: 200,
    message: "Survey stats retrieved",
    data: syncResult
  });
});

/**
 * Import single survey from SurveySherpa into PanelSurvey
 */
export const importSingleSurvey = asyncHandler(async (req, res) => {
  const surveyId = Number(req.params.id);
  if (!surveyId) throw new ApiError(400, "Valid survey ID is required");

  const { autoActivate, defaultStatus } = req.body;
  const result = await surveySherpaSyncService.importSurveyById(surveyId, {
    autoActivate: Boolean(autoActivate),
    defaultStatus
  });

  sendResponse(res, {
    statusCode: 201,
    message: result.isNew ? "Survey imported successfully" : "Survey updated successfully",
    data: result
  });
});

/**
 * Trigger sync of all surveys from SurveySherpa
 */
export const postSyncAllSurveys = asyncHandler(async (req, res) => {
  const { autoActivate, syncQualifications, defaultStatus } = req.body;
  const result = await surveySherpaSyncService.syncAllSurveys({
    autoActivate: Boolean(autoActivate),
    syncQualifications: Boolean(syncQualifications),
    defaultStatus
  });

  sendResponse(res, {
    statusCode: 200,
    message: `Sync complete: ${result.created} created, ${result.updated} updated, ${result.failed} failed`,
    data: result
  });
});
