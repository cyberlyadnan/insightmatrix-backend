import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/ApiResponse';
import { surveyService } from '../services/survey.service';

export const createSurvey = asyncHandler(async (req, res) => {
  const survey = await surveyService.create({ ...req.body, createdBy: req.user._id });
  sendResponse(res, { statusCode: 201, message: "Survey created", data: survey });
});

export const listSurveys = asyncHandler(async (req, res) => {
  const surveys = await surveyService.list();
  sendResponse(res, { data: surveys });
});

export const updateSurvey = asyncHandler(async (req, res) => {
  const survey = await surveyService.updateById(req.params.id, req.body);
  sendResponse(res, { message: "Survey updated", data: survey });
});

export const deleteSurvey = asyncHandler(async (req, res) => {
  await surveyService.deleteById(req.params.id);
  sendResponse(res, { message: "Survey deleted" });
});

export const publishSurvey = asyncHandler(async (req, res) => {
  const survey = await surveyService.publish(req.params.id);
  sendResponse(res, { message: "Survey published", data: survey });
});

export const surveyAnalytics = asyncHandler(async (req, res) => {
  const analytics = await surveyService.analytics(req.params.id);
  sendResponse(res, { data: analytics });
});

