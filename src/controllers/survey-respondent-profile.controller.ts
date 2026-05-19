import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { surveyRespondentProfileService } from "../services/survey-respondent-profile/survey-respondent-profile.service";
import {
  streamRespondentCsvRows,
  buildRespondentXlsxBuffer
} from "../services/survey-respondent-profile/respondent-export.service";

export const listSurveyRespondentProfiles = asyncHandler(async (req, res) => {
  const q = req.validatedQuery ?? req.query;
  const result = await surveyRespondentProfileService.list({
    vendorId: q.vendorId as string | undefined,
    panelSurveyId: q.panelSurveyId as string | undefined,
    allocationId: q.allocationId as string | undefined,
    surveyStatus: q.surveyStatus as never,
    respondentOwnerType: q.respondentOwnerType as "internal" | "vendor" | undefined,
    search: q.search as string | undefined,
    dateFrom: q.dateFrom as string | undefined,
    dateTo: q.dateTo as string | undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 20
  });
  sendResponse(res, { data: result.items, meta: result.meta });
});

export const getSurveyRespondentProfile = asyncHandler(async (req, res) => {
  const detail = await surveyRespondentProfileService.getById(req.params.id);
  if (!detail) throw new ApiError(404, "Respondent not found");
  sendResponse(res, { data: detail });
});

export const getRespondentAnalytics = asyncHandler(async (req, res) => {
  const q = req.validatedQuery ?? req.query;
  const summary = await surveyRespondentProfileService.getAnalyticsSummary({
    vendorId: q.vendorId as string | undefined,
    panelSurveyId: q.panelSurveyId as string | undefined,
    dateFrom: q.dateFrom as string | undefined,
    dateTo: q.dateTo as string | undefined
  });
  sendResponse(res, { data: summary });
});

export const exportSurveyRespondents = asyncHandler(async (req, res) => {
  const body = req.body;
  const filter = {
    vendorId: body.vendorId,
    panelSurveyId: body.panelSurveyId,
    allocationId: body.allocationId,
    surveyStatus: body.surveyStatus,
    respondentOwnerType: body.respondentOwnerType,
    dateFrom: body.dateFrom,
    dateTo: body.dateTo
  };

  if (body.format === "xlsx") {
    const buffer = await buildRespondentXlsxBuffer(filter);
    res.setHeader(
      "Content-Type",
      "application/vnd.ms-excel"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="respondents-${Date.now()}.xls"`
    );
    return res.send(buffer);
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="respondents-${Date.now()}.csv"`
  );

  for await (const chunk of streamRespondentCsvRows(filter)) {
    res.write(chunk);
  }
  return res.end();
});
