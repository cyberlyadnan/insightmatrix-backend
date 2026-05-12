import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/ApiResponse';
import { surveyCompanyService } from '../services/survey-company.service';
import { toSurveyCompanyDto } from '../utils/survey-company.dto';

export const listSurveyCompanies = asyncHandler(async (req, res) => {
  const result = await surveyCompanyService.list(req.validatedQuery ?? req.query);
  sendResponse(res, {
    data: result.items.map((item) => toSurveyCompanyDto(item)),
    meta: result.meta
  });
});

export const getSurveyCompany = asyncHandler(async (req, res) => {
  const doc = await surveyCompanyService.getById(req.params.id);
  sendResponse(res, { data: toSurveyCompanyDto(doc) });
});

export const createSurveyCompany = asyncHandler(async (req, res) => {
  const doc = await surveyCompanyService.create(req.body);
  sendResponse(res, {
    statusCode: 201,
    message: "Company created",
    data: toSurveyCompanyDto(doc)
  });
});

export const updateSurveyCompany = asyncHandler(async (req, res) => {
  const doc = await surveyCompanyService.updateById(req.params.id, req.body);
  sendResponse(res, { message: "Company updated", data: toSurveyCompanyDto(doc) });
});

export const patchSurveyCompanyStatus = asyncHandler(async (req, res) => {
  const doc = await surveyCompanyService.setStatus(req.params.id, req.body.status);
  sendResponse(res, { message: "Company status updated", data: toSurveyCompanyDto(doc) });
});

export const deleteSurveyCompany = asyncHandler(async (req, res) => {
  await surveyCompanyService.deleteById(req.params.id);
  sendResponse(res, { message: "Company deleted" });
});
