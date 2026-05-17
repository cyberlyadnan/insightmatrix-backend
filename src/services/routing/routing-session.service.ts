import crypto from "crypto";
import { Types } from "mongoose";
import { ApiError } from "../../utils/ApiError";
import { PanelSurveyAttempt } from "../../models/PanelSurveyAttempt";
import { VendorRespondentSession } from "../../models/VendorRespondentSession";
import { vendorRespondentSessionRepository } from "../../repositories/vendor-respondent-session.repository";
import { vendorAllocationRepository } from "../../repositories/vendor-allocation.repository";
import { refreshAllocationQuotaFields } from "../vendor-allocation/allocation-quota.service";
import type { ValidatedPanelSurvey, ValidatedVendorAllocation } from "./routing-gateway.service";

export function generateRoutingSessionToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

export type PanelSessionContext = {
  channel: "panel";
  sessionToken: string;
  panelSurveyId: Types.ObjectId;
  attemptId: Types.ObjectId;
  userId: Types.ObjectId;
};

export type VendorSessionContext = {
  channel: "vendor";
  sessionToken: string;
  sessionId: Types.ObjectId;
  panelSurveyId: Types.ObjectId;
  vendorId: Types.ObjectId;
  allocationId: Types.ObjectId;
};

export type ResolvedRoutingSession =
  | ({ type: "panel" } & PanelSessionContext)
  | ({ type: "vendor" } & VendorSessionContext)
  | null;

export const routingSessionService = {
  async resolvePanelAttemptByToken(
    validated: ValidatedPanelSurvey,
    attemptToken: string
  ): Promise<PanelSessionContext> {
    const token = attemptToken.trim();
    if (!token) {
      throw new ApiError(400, "Attempt token is required");
    }

    const existing = await PanelSurveyAttempt.findOne({
      token,
      panelSurveyId: validated.surveyId
    }).lean();

    if (!existing) {
      throw new ApiError(404, "Invalid or expired survey attempt");
    }

    return {
      channel: "panel",
      sessionToken: existing.token,
      panelSurveyId: validated.surveyId,
      attemptId: existing._id as Types.ObjectId,
      userId: existing.userId as Types.ObjectId
    };
  },

  async createVendorRespondentSession(
    validated: ValidatedVendorAllocation,
    meta: {
      vendorRespondentId?: string;
      trafficSource?: string;
      sourceIp?: string;
      userAgent?: string;
    }
  ): Promise<VendorSessionContext> {
    const sessionToken = generateRoutingSessionToken();
    const now = new Date();

    const session = await vendorRespondentSessionRepository.create({
      sessionToken,
      vendorId: validated.vendorId,
      allocationId: validated.allocationId,
      panelSurveyId: validated.surveyId,
      supplierProjectPid: validated.supplierProjectPid,
      status: "started",
      trafficSource: String(meta.trafficSource ?? "").trim().slice(0, 500),
      sourceIp: String(meta.sourceIp ?? "").trim().slice(0, 64),
      userAgent: String(meta.userAgent ?? "").trim().slice(0, 2000),
      vendorRespondentId: String(meta.vendorRespondentId ?? "").trim().slice(0, 500),
      startedAt: now
    });

    return {
      channel: "vendor",
      sessionToken,
      sessionId: session._id as Types.ObjectId,
      panelSurveyId: validated.surveyId,
      vendorId: validated.vendorId,
      allocationId: validated.allocationId
    };
  },

  async markVendorSessionRedirected(sessionId: Types.ObjectId, allocationId: Types.ObjectId) {
    await vendorRespondentSessionRepository.updateStatus(sessionId, "redirected", {
      redirectedAt: new Date()
    });
    await vendorAllocationRepository.incrementCounters(allocationId, { startedCount: 1 });
    await refreshAllocationQuotaFields(allocationId);
  },

  async resolveByParticipantRef(participantRef: string): Promise<ResolvedRoutingSession> {
    const token = participantRef.trim();
    if (!token) return null;

    const vendorSession = await VendorRespondentSession.findOne({ sessionToken: token }).lean();
    if (vendorSession) {
      return {
        type: "vendor",
        channel: "vendor",
        sessionToken: token,
        sessionId: vendorSession._id as Types.ObjectId,
        panelSurveyId: vendorSession.panelSurveyId as Types.ObjectId,
        vendorId: vendorSession.vendorId as Types.ObjectId,
        allocationId: vendorSession.allocationId as Types.ObjectId
      };
    }

    const panelAttempt = await PanelSurveyAttempt.findOne({ token }).lean();
    if (panelAttempt) {
      return {
        type: "panel",
        channel: "panel",
        sessionToken: token,
        panelSurveyId: panelAttempt.panelSurveyId as Types.ObjectId,
        attemptId: panelAttempt._id as Types.ObjectId,
        userId: panelAttempt.userId as Types.ObjectId
      };
    }

    return null;
  }
};
