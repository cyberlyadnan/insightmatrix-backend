import { Types } from "mongoose";
import { ApiError } from "../../utils/ApiError";
import { PanelSurvey } from "../../models/PanelSurvey";
import { vendorAllocationRepository } from "../../repositories/vendor-allocation.repository";
import { gatewayRoutingLogRepository } from "../../repositories/gateway-routing-log.repository";
import { gatewayValidationService } from "../gateway/gateway-validation.service";
import { computeLiveRemainingQuota } from "../vendor-allocation/allocation-quota.service";
import type { GatewayRoutingAction, RoutingChannel } from "../../constants/routing-gateway";

export type GatewayLogInput = {
  channel: RoutingChannel;
  action: GatewayRoutingAction;
  success: boolean;
  panelSurveyId?: string | Types.ObjectId | null;
  vendorId?: string | Types.ObjectId | null;
  allocationId?: string | Types.ObjectId | null;
  sessionToken?: string;
  failureReason?: string;
  sourceIp?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

function oid(v: string | Types.ObjectId | null | undefined): Types.ObjectId | null {
  if (!v) return null;
  const s = String(v);
  return Types.ObjectId.isValid(s) ? new Types.ObjectId(s) : null;
}

/** Fire-and-forget gateway audit log — never throws */
export async function logGatewayEvent(input: GatewayLogInput): Promise<void> {
  try {
    await gatewayRoutingLogRepository.create({
      channel: input.channel,
      action: input.action,
      success: input.success,
      panelSurveyId: oid(input.panelSurveyId),
      vendorId: oid(input.vendorId),
      allocationId: oid(input.allocationId),
      sessionToken: String(input.sessionToken ?? "").slice(0, 128),
      failureReason: String(input.failureReason ?? "").slice(0, 500),
      sourceIp: String(input.sourceIp ?? "").slice(0, 64),
      userAgent: String(input.userAgent ?? "").slice(0, 2000),
      metadata: input.metadata ?? null
    });
  } catch {
    /* logging must not break routing */
  }
}

export type ValidatedPanelSurvey = {
  survey: Record<string, unknown>;
  surveyId: Types.ObjectId;
  externalSurveyUrl: string;
  trackingParameterName: string;
  supplierProjectPid: string;
};

export type ValidatedVendorAllocation = {
  allocation: Record<string, unknown>;
  allocationId: Types.ObjectId;
  vendor: Record<string, unknown>;
  vendorId: Types.ObjectId;
  survey: Record<string, unknown>;
  surveyId: Types.ObjectId;
  externalSurveyUrl: string;
  trackingParameterName: string;
  supplierProjectPid: string;
  allocationCode: string;
};

/**
 * Lightweight survey validation — active status + quota only.
 * Future fraud/IP checks plug in via gatewayValidationService first.
 */
export async function validatePanelSurveyForRouting(
  surveyId: string,
  ctx?: { sourceIp?: string; userAgent?: string }
): Promise<ValidatedPanelSurvey> {
  if (!Types.ObjectId.isValid(surveyId)) {
    throw new ApiError(400, "Invalid survey id");
  }

  const survey = await PanelSurvey.findById(surveyId).lean();
  if (!survey) throw new ApiError(404, "Survey not found");

  const gateway = await gatewayValidationService.validateSession({
    panelSurveyId: surveyId,
    ipAddress: ctx?.sourceIp,
    userAgent: ctx?.userAgent
  });
  if (!gateway.allowed) {
    throw new ApiError(403, gateway.reasons[0] ?? "Gateway blocked session");
  }

  if (survey.surveyStatus !== "active") {
    throw new ApiError(403, "Survey is not accepting traffic");
  }
  if ((survey.remainingQuota ?? 0) <= 0) {
    throw new ApiError(403, "Survey quota is full");
  }

  const now = new Date();
  if (survey.startDate && new Date(survey.startDate) > now) {
    throw new ApiError(403, "Survey has not started yet");
  }
  if (survey.endDate && new Date(survey.endDate) < now) {
    throw new ApiError(403, "Survey has ended");
  }

  const externalSurveyUrl = String(survey.externalSurveyUrl ?? "").trim();
  if (!externalSurveyUrl) {
    throw new ApiError(500, "Survey entry URL is not configured");
  }

  const supplierProjectPid = String(survey.supplierProjectPid ?? "").trim();
  if (!supplierProjectPid) {
    throw new ApiError(400, "Survey is missing supplier project id (pid)");
  }

  return {
    survey: survey as Record<string, unknown>,
    surveyId: survey._id as Types.ObjectId,
    externalSurveyUrl,
    trackingParameterName: String(survey.trackingParameterName ?? "toid").trim() || "toid",
    supplierProjectPid
  };
}

/** Lightweight allocation + survey validation for vendor channel */
export async function validateVendorAllocationForRouting(
  allocationCode: string,
  ctx?: { sourceIp?: string; userAgent?: string }
): Promise<ValidatedVendorAllocation> {
  const code = allocationCode.trim().toUpperCase();
  if (!code) throw new ApiError(400, "allocationCode is required");

  const allocation = await vendorAllocationRepository.findByCode(code);
  if (!allocation) throw new ApiError(404, "Allocation not found");

  const allocationId = new Types.ObjectId(String(allocation._id));
  const vendor = allocation.vendorId as unknown as Record<string, unknown> | null;
  const survey = allocation.panelSurveyId as unknown as Record<string, unknown> | null;

  if (!vendor?._id) throw new ApiError(404, "Vendor not found");
  if (!survey?._id) throw new ApiError(404, "Survey not found for allocation");

  const vendorId = new Types.ObjectId(String(vendor._id));
  const surveyId = new Types.ObjectId(String(survey._id));

  const gateway = await gatewayValidationService.validateSession({
    allocationCode: code,
    panelSurveyId: String(surveyId),
    vendorId: String(vendorId),
    ipAddress: ctx?.sourceIp,
    userAgent: ctx?.userAgent
  });
  if (!gateway.allowed) {
    throw new ApiError(403, gateway.reasons[0] ?? "Gateway blocked session");
  }

  if (allocation.status === "paused") throw new ApiError(403, "This allocation is paused");
  if (allocation.status === "closed") throw new ApiError(403, "This allocation is closed");
  if (allocation.status === "completed") {
    throw new ApiError(403, "This allocation has reached its quota");
  }
  if (vendor.status === "suspended" || vendor.status === "paused") {
    throw new ApiError(403, "Vendor is not available for traffic");
  }
  if (survey.surveyStatus !== "active") {
    throw new ApiError(403, "Survey is not accepting traffic");
  }

  const liveRemaining = computeLiveRemainingQuota(
    Number(allocation.allocatedQuota ?? 0),
    Number(allocation.completedCount ?? 0)
  );
  if (liveRemaining <= 0) throw new ApiError(403, "Allocation quota is full");
  if (Number(survey.remainingQuota ?? 0) <= 0) throw new ApiError(403, "Survey quota is full");

  const now = new Date();
  if (allocation.startDate && new Date(allocation.startDate) > now) {
    throw new ApiError(403, "Allocation has not started yet");
  }
  if (allocation.endDate && new Date(allocation.endDate) < now) {
    throw new ApiError(403, "Allocation has ended");
  }

  const externalSurveyUrl = String(survey.externalSurveyUrl ?? "").trim();
  if (!externalSurveyUrl) throw new ApiError(500, "Survey entry URL is not configured");

  const supplierProjectPid = String(survey.supplierProjectPid ?? "").trim();
  if (!supplierProjectPid) throw new ApiError(400, "Survey missing supplier project id");

  return {
    allocation: allocation as Record<string, unknown>,
    allocationId,
    vendor,
    vendorId,
    survey,
    surveyId,
    externalSurveyUrl,
    trackingParameterName: String(survey.trackingParameterName ?? "toid").trim() || "toid",
    supplierProjectPid,
    allocationCode: code
  };
}

export const routingGatewayService = {
  logGatewayEvent,
  validatePanelSurveyForRouting,
  validateVendorAllocationForRouting
};
