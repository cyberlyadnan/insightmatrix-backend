import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/ApiResponse';
import { responseService } from '../services/response.service';

export const submitResponse = asyncHandler(async (req, res) => {
  const response = await responseService.submit(req.body);
  sendResponse(res, { statusCode: 201, message: "Response submitted", data: response });
});

export const getResponses = asyncHandler(async (req, res) => {
  const data = await responseService.listBySurvey(req.params.surveyId);
  sendResponse(res, { data });
});

export const exportResponses = asyncHandler(async (req, res) => {
  const data = await responseService.exportBySurvey(req.params.surveyId);
  sendResponse(res, { data });
});

