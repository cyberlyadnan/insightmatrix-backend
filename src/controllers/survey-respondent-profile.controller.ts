import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { surveyRespondentProfileService } from "../services/survey-respondent-profile/survey-respondent-profile.service";
import {
  streamRespondentCsvRows,
  buildRespondentXlsxBuffer,
  buildRespondentPdfBuffer,
  countExportRows,
  resolveExportMeta,
  formatSurveyStatusLabel
} from "../services/survey-respondent-profile/respondent-export.service";
import { Vendor } from "../models/Vendor";
import { PanelSurvey } from "../models/PanelSurvey";
import { Types } from "mongoose";

async function resolveFilterLabels(filter: {
  vendorId?: string;
  panelSurveyId?: string;
  surveyStatus?: string;
}) {
  let surveyName = "";
  let vendorName = "";

  if (filter.panelSurveyId && Types.ObjectId.isValid(filter.panelSurveyId)) {
    const survey = await PanelSurvey.findById(filter.panelSurveyId)
      .select("surveyName surveyCode")
      .lean();
    if (survey) {
      surveyName = `${survey.surveyName} (${survey.surveyCode})`;
    }
  }

  if (filter.vendorId && Types.ObjectId.isValid(filter.vendorId)) {
    const vendor = await Vendor.findById(filter.vendorId).select("companyName vendorCode").lean();
    if (vendor) {
      vendorName = `${vendor.companyName} (${vendor.vendorCode})`;
    }
  }

  return {
    surveyName: surveyName || (filter.panelSurveyId ? filter.panelSurveyId : "All surveys"),
    vendorName: vendorName || (filter.vendorId ? filter.vendorId : "All vendors"),
    statusLabel: filter.surveyStatus?.trim()
      ? formatSurveyStatusLabel(filter.surveyStatus)
      : "All"
  };
}

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
  const body = req.body as {
    format?: "csv" | "xlsx" | "pdf";
    vendorId?: string;
    panelSurveyId?: string;
    allocationId?: string;
    surveyStatus?: string;
    respondentOwnerType?: "internal" | "vendor";
    dateFrom?: string;
    dateTo?: string;
  };

  const dateFrom = body.dateFrom?.trim() || undefined;
  const dateTo = body.dateTo?.trim() || undefined;

  if (dateFrom && dateTo) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from > to) {
      throw new ApiError(400, "Please select a valid date range.");
    }
  }

  const filter = {
    vendorId: body.vendorId?.trim() || undefined,
    panelSurveyId: body.panelSurveyId?.trim() || undefined,
    allocationId: body.allocationId?.trim() || undefined,
    surveyStatus: body.surveyStatus?.trim() || undefined,
    respondentOwnerType: body.respondentOwnerType,
    dateFrom,
    dateTo
  };

  const total = await countExportRows(filter);
  if (total === 0) {
    throw new ApiError(404, "No records found for the selected filters.");
  }

  const format = body.format ?? "csv";
  const stamp = Date.now();

  if (format === "xlsx") {
    const buffer = await buildRespondentXlsxBuffer(filter);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="survey-export-${stamp}.xlsx"`);
    return res.send(buffer);
  }

  if (format === "pdf") {
    const labels = await resolveFilterLabels(filter);
    const meta = await resolveExportMeta(filter, {
      surveyName: labels.surveyName,
      vendorName: labels.vendorName
    });
    meta.statusLabel = labels.statusLabel;

    const buffer = await buildRespondentPdfBuffer(filter, { meta });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="survey-export-${stamp}.pdf"`);
    return res.send(buffer);
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="survey-export-${stamp}.csv"`);

  for await (const chunk of streamRespondentCsvRows(filter)) {
    res.write(chunk);
  }
  return res.end();
});
