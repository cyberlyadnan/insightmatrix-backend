import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/ApiResponse';
import { panelSurveyService } from '../services/panel-survey.service';
import { toPanelSurveyDto, toPanelSurveyPublicDto } from '../utils/panel-survey.dto';

export const listPanelSurveys = asyncHandler(async (req, res) => {
  const result = await panelSurveyService.list(req.validatedQuery ?? req.query);
  sendResponse(res, {
    data: result.items.map((item) => toPanelSurveyDto(item.toObject ? item.toObject() : item)),
    meta: result.meta
  });
});

export const getPanelSurvey = asyncHandler(async (req, res) => {
  const doc = await panelSurveyService.getById(req.params.id);
  sendResponse(res, { data: toPanelSurveyDto(doc.toObject()) });
});

export const getPublicPanelSurvey = asyncHandler(async (req, res) => {
  const doc = await panelSurveyService.getPublicById(req.params.id);
  sendResponse(res, { data: toPanelSurveyPublicDto(doc.toObject()) });
});

export const createPanelSurvey = asyncHandler(async (req, res) => {
  const doc = await panelSurveyService.create({
    ...req.body,
    createdBy: req.user._id
  });
  sendResponse(res, {
    statusCode: 201,
    message: "Survey created",
    data: toPanelSurveyDto(doc.toObject())
  });
});

export const updatePanelSurvey = asyncHandler(async (req, res) => {
  const doc = await panelSurveyService.updateById(req.params.id, req.body);
  sendResponse(res, { message: "Survey updated", data: toPanelSurveyDto(doc.toObject()) });
});

export const patchPanelSurveyStatus = asyncHandler(async (req, res) => {
  const doc = await panelSurveyService.setStatus(req.params.id, req.body.surveyStatus);
  sendResponse(res, { message: "Survey status updated", data: toPanelSurveyDto(doc.toObject()) });
});

export const deletePanelSurvey = asyncHandler(async (req, res) => {
  await panelSurveyService.deleteById(req.params.id);
  sendResponse(res, { message: "Survey deleted" });
});
