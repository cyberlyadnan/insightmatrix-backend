import { Types } from "mongoose";
import { ApiError } from "../../utils/ApiError";
import { PanelSurvey } from "../../models/PanelSurvey";
import { vendorAllocationRepository } from "../../repositories/vendor-allocation.repository";
import { vendorRespondentSessionRepository } from "../../repositories/vendor-respondent-session.repository";
import { buildSupplierEntryUrl } from "../../utils/supplier-entry-url";
import { gatewayValidationService } from "../gateway/gateway-validation.service";
import {
  computeLiveRemainingQuota,
  refreshAllocationQuotaFields
} from "./allocation-quota.service";
import {
  generateSessionToken,
  markSessionRedirected
} from "./session-tracking.service";

export type VendorRoutingStartInput = {
  allocationCode: string;
  vendorRespondentId?: string;
  trafficSource?: string;
  sourceIp?: string;
  userAgent?: string;
};

export type VendorRoutingStartResult = {
  sessionToken: string;
  redirectUrl: string;
  allocationCode: string;
};

/**
 * Public vendor entry: validate allocation → create session → redirect URL with toid=sessionToken only.
 * Supplier pid/vid are never modified.
 */
export async function startVendorRoutingSession(
  input: VendorRoutingStartInput
): Promise<VendorRoutingStartResult> {
  const code = input.allocationCode.trim().toUpperCase();
  if (!code) throw new ApiError(400, "allocationCode is required");

  const allocation = await vendorAllocationRepository.findByCode(code);
  if (!allocation) throw new ApiError(404, "Allocation not found");

  if (allocation.status === "paused") {
    throw new ApiError(403, "This allocation is paused");
  }
  if (allocation.status === "closed") {
    throw new ApiError(403, "This allocation is closed");
  }
  if (allocation.status === "completed") {
    throw new ApiError(403, "This allocation has reached its quota");
  }

  const vendor = allocation.vendorId as unknown as Record<string, unknown> | null;
  if (!vendor || vendor.status === "suspended" || vendor.status === "paused") {
    throw new ApiError(403, "Vendor is not available for traffic");
  }

  const survey = allocation.panelSurveyId as unknown as Record<string, unknown> | null;
  if (!survey) throw new ApiError(404, "Survey not found for allocation");

  if (survey.surveyStatus !== "active") {
    throw new ApiError(403, "Survey is not accepting traffic");
  }

  const liveRemaining = computeLiveRemainingQuota(
    Number(allocation.allocatedQuota ?? 0),
    Number(allocation.completedCount ?? 0)
  );
  if (liveRemaining <= 0) {
    throw new ApiError(403, "Allocation quota is full");
  }

  const surveyRemaining = Number(survey.remainingQuota ?? 0);
  if (surveyRemaining <= 0) {
    throw new ApiError(403, "Survey quota is full");
  }

  const now = new Date();
  if (allocation.startDate && new Date(allocation.startDate) > now) {
    throw new ApiError(403, "Allocation has not started yet");
  }
  if (allocation.endDate && new Date(allocation.endDate) < now) {
    throw new ApiError(403, "Allocation has ended");
  }

  const gateway = await gatewayValidationService.validateSession({
    allocationCode: code,
    panelSurveyId: String(
      (allocation.panelSurveyId as { _id?: unknown })?._id ?? allocation.panelSurveyId
    ),
    vendorId: String((allocation.vendorId as { _id?: unknown })?._id ?? allocation.vendorId),
    ipAddress: input.sourceIp,
    userAgent: input.userAgent
  });
  if (!gateway.allowed) {
    throw new ApiError(403, gateway.reasons[0] ?? "Session blocked by gateway");
  }

  const sessionToken = generateSessionToken();
  const externalSurveyUrl = String(survey.externalSurveyUrl ?? "").trim();
  if (!externalSurveyUrl) {
    throw new ApiError(500, "Survey entry URL is not configured");
  }

  const trackingKey = String(survey.trackingParameterName ?? "toid").trim() || "toid";
  const supplierProjectPid = String(survey.supplierProjectPid ?? "").trim();

  const session = await vendorRespondentSessionRepository.create({
    sessionToken,
    vendorId: allocation.vendorId,
    allocationId: allocation._id,
    panelSurveyId: allocation.panelSurveyId,
    supplierProjectPid,
    status: "started",
    trafficSource: String(input.trafficSource ?? "").trim().slice(0, 500),
    sourceIp: String(input.sourceIp ?? "").trim().slice(0, 64),
    userAgent: String(input.userAgent ?? "").trim().slice(0, 2000),
    vendorRespondentId: String(input.vendorRespondentId ?? "").trim().slice(0, 500),
    startedAt: now
  });

  const redirectUrl = buildSupplierEntryUrl(externalSurveyUrl, trackingKey, sessionToken);

  await markSessionRedirected(new Types.ObjectId(String(session._id)));
  await vendorAllocationRepository.incrementCounters(new Types.ObjectId(String(allocation._id)), {
    startedCount: 1
  });
  await refreshAllocationQuotaFields(new Types.ObjectId(String(allocation._id)));

  return {
    sessionToken,
    redirectUrl,
    allocationCode: code
  };
}

/** Extension point: future fraud/IP checks before redirect (Prompt 3+) */
export const vendorRoutingService = {
  startVendorRoutingSession
};
