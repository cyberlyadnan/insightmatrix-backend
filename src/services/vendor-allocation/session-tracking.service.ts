import crypto from "crypto";
import { Types } from "mongoose";
import type { PanelRoutingEventType } from "../../constants/panel-survey-routing";
import {
  ROUTING_EVENT_TO_SESSION_STATUS,
  type VendorRespondentSessionStatus
} from "../../constants/vendor-allocation";
import { vendorRespondentSessionRepository } from "../../repositories/vendor-respondent-session.repository";
import { vendorAllocationRepository } from "../../repositories/vendor-allocation.repository";
import {
  computeLiveRemainingQuota,
  refreshAllocationQuotaFields
} from "./allocation-quota.service";

/** Master tracking id — only InsightMatrix generates this (supplier sees it as toid) */
export function generateSessionToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

const TERMINAL_STATUSES: VendorRespondentSessionStatus[] = [
  "complete",
  "terminate",
  "quota_full",
  "quality_reject"
];

function counterFieldForStatus(
  status: VendorRespondentSessionStatus
): "completedCount" | "terminateCount" | "quotaFullCount" | "qualityRejectCount" | null {
  switch (status) {
    case "complete":
      return "completedCount";
    case "terminate":
      return "terminateCount";
    case "quota_full":
      return "quotaFullCount";
    case "quality_reject":
      return "qualityRejectCount";
    default:
      return null;
  }
}

/**
 * Sync vendor session + allocation counters when supplier callback references our sessionToken.
 * Does NOT relay callbacks to vendor URLs (Prompt 3).
 */
export async function tryApplyOutcomeFromRoutingEvent(
  supplierParticipantRef: string | null | undefined,
  eventType: PanelRoutingEventType
): Promise<void> {
  const token = String(supplierParticipantRef ?? "").trim();
  if (!token) return;

  const sessionStatus = ROUTING_EVENT_TO_SESSION_STATUS[eventType];
  if (!sessionStatus) return;

  const session = await vendorRespondentSessionRepository.findByToken(token);
  if (!session) return;

  if (TERMINAL_STATUSES.includes(session.status as VendorRespondentSessionStatus)) {
    return;
  }

  const sessionId = new Types.ObjectId(String(session._id));
  const allocationId = new Types.ObjectId(String(session.allocationId));

  await vendorRespondentSessionRepository.updateStatus(sessionId, sessionStatus, {
    completedAt: new Date()
  });

  const counterField = counterFieldForStatus(sessionStatus);
  if (counterField) {
    await vendorAllocationRepository.incrementCounters(allocationId, { [counterField]: 1 });
  }

  await refreshAllocationQuotaFields(allocationId);
}

export async function markSessionRedirected(sessionId: Types.ObjectId) {
  await vendorRespondentSessionRepository.updateStatus(sessionId, "redirected", {
    redirectedAt: new Date()
  });
}

export { computeLiveRemainingQuota };
