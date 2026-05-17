import { Types } from "mongoose";
import { ApiError } from "../../utils/ApiError";
import { PanelSurvey } from "../../models/PanelSurvey";
import { vendorAllocationRepository } from "../../repositories/vendor-allocation.repository";
import { VendorSurveyAllocation } from "../../models/VendorSurveyAllocation";

export function computeLiveRemainingQuota(
  allocatedQuota: number,
  completedCount: number
): number {
  return Math.max(0, allocatedQuota - completedCount);
}

export function computeRates(startedCount: number, completedCount: number) {
  const conversionRate =
    startedCount > 0 ? Math.round((completedCount / startedCount) * 10000) / 100 : 0;
  const incidenceRate = conversionRate;
  return { conversionRate, incidenceRate };
}

/**
 * Validates that new/updated allocation quota fits within survey remaining quota
 * without modifying PanelSurvey.remainingQuota (additive extension only).
 */
export async function validateAllocationQuotaAgainstSurvey(
  panelSurveyId: string,
  requestedQuota: number,
  excludeAllocationId?: string
): Promise<{ surveyRemainingQuota: number; otherAllocated: number }> {
  if (!Types.ObjectId.isValid(panelSurveyId)) {
    throw new ApiError(400, "Invalid panel survey id");
  }
  if (!Number.isFinite(requestedQuota) || requestedQuota < 1) {
    throw new ApiError(400, "allocatedQuota must be at least 1");
  }

  const survey = await PanelSurvey.findById(panelSurveyId).select("remainingQuota surveyStatus").lean();
  if (!survey) throw new ApiError(404, "Panel survey not found");

  const sid = new Types.ObjectId(panelSurveyId);
  const exclude = excludeAllocationId && Types.ObjectId.isValid(excludeAllocationId)
    ? new Types.ObjectId(excludeAllocationId)
    : undefined;

  const otherAllocated = await vendorAllocationRepository.sumAllocatedQuotaForSurvey(sid, exclude);
  const surveyRemaining = Number(survey.remainingQuota ?? 0);

  if (otherAllocated + requestedQuota > surveyRemaining) {
    throw new ApiError(
      400,
      `Allocation quota exceeds survey remaining quota. Survey has ${surveyRemaining} remaining; ` +
        `${otherAllocated} already assigned to active/paused allocations.`
    );
  }

  return { surveyRemainingQuota: surveyRemaining, otherAllocated };
}

export async function refreshAllocationQuotaFields(allocationId: Types.ObjectId) {
  const doc = await VendorSurveyAllocation.findById(allocationId).lean();
  if (!doc) return null;

  const liveRemainingQuota = computeLiveRemainingQuota(
    doc.allocatedQuota,
    doc.completedCount ?? 0
  );
  const { conversionRate, incidenceRate } = computeRates(
    doc.startedCount ?? 0,
    doc.completedCount ?? 0
  );

  let status = doc.status;
  if (status === "active" && liveRemainingQuota <= 0 && (doc.completedCount ?? 0) > 0) {
    status = "completed";
  }

  return VendorSurveyAllocation.findByIdAndUpdate(
    allocationId,
    { $set: { liveRemainingQuota, conversionRate, incidenceRate, status } },
    { new: true }
  ).lean();
}
