import { Types } from "mongoose";
import { ApiError } from "../../utils/ApiError";
import { VendorSurveyAllocation } from "../../models/VendorSurveyAllocation";
import { VendorRespondentSession } from "../../models/VendorRespondentSession";
import type { VendorAllocationAnalyticsDto } from "../../utils/vendor-allocation.dto";

export async function fetchAllocationAnalytics(
  allocationId: string
): Promise<VendorAllocationAnalyticsDto> {
  if (!Types.ObjectId.isValid(allocationId)) {
    throw new ApiError(400, "Invalid allocation id");
  }

  const alloc = await VendorSurveyAllocation.findById(allocationId).lean();
  if (!alloc) throw new ApiError(404, "Allocation not found");

  const aid = new Types.ObjectId(allocationId);
  const redirectCount = await VendorRespondentSession.countDocuments({
    allocationId: aid,
    redirectedAt: { $ne: null }
  });

  return {
    allocationId,
    allocationCode: String(alloc.allocationCode),
    status: alloc.status,
    allocatedQuota: alloc.allocatedQuota ?? 0,
    liveRemainingQuota: alloc.liveRemainingQuota ?? 0,
    startedCount: alloc.startedCount ?? 0,
    completedCount: alloc.completedCount ?? 0,
    terminateCount: alloc.terminateCount ?? 0,
    quotaFullCount: alloc.quotaFullCount ?? 0,
    qualityRejectCount: alloc.qualityRejectCount ?? 0,
    conversionRate: alloc.conversionRate ?? 0,
    incidenceRate: alloc.incidenceRate ?? 0,
    redirectCount
  };
}

export async function fetchVendorLevelAnalytics(vendorId: string) {
  if (!Types.ObjectId.isValid(vendorId)) throw new ApiError(400, "Invalid vendor id");

  const vid = new Types.ObjectId(vendorId);
  const agg = await VendorSurveyAllocation.aggregate<{
    _id: null;
    allocations: number;
    allocatedQuota: number;
    startedCount: number;
    completedCount: number;
    terminateCount: number;
    quotaFullCount: number;
    qualityRejectCount: number;
  }>([
    { $match: { vendorId: vid } },
    {
      $group: {
        _id: null,
        allocations: { $sum: 1 },
        allocatedQuota: { $sum: "$allocatedQuota" },
        startedCount: { $sum: "$startedCount" },
        completedCount: { $sum: "$completedCount" },
        terminateCount: { $sum: "$terminateCount" },
        quotaFullCount: { $sum: "$quotaFullCount" },
        qualityRejectCount: { $sum: "$qualityRejectCount" }
      }
    }
  ]);

  const row = agg[0];
  const started = row?.startedCount ?? 0;
  const completed = row?.completedCount ?? 0;

  return {
    allocations: row?.allocations ?? 0,
    allocatedQuota: row?.allocatedQuota ?? 0,
    startedCount: started,
    completedCount: completed,
    terminateCount: row?.terminateCount ?? 0,
    quotaFullCount: row?.quotaFullCount ?? 0,
    qualityRejectCount: row?.qualityRejectCount ?? 0,
    conversionRate: started > 0 ? Math.round((completed / started) * 10000) / 100 : 0
  };
}

export async function fetchSurveyLevelVendorAnalytics(panelSurveyId: string) {
  if (!Types.ObjectId.isValid(panelSurveyId)) {
    throw new ApiError(400, "Invalid survey id");
  }

  const sid = new Types.ObjectId(panelSurveyId);
  const byVendor = await VendorSurveyAllocation.aggregate<{
    _id: Types.ObjectId;
    allocationCode: string;
    status: string;
    allocatedQuota: number;
    completedCount: number;
    startedCount: number;
  }>([
    { $match: { panelSurveyId: sid } },
    {
      $project: {
        vendorId: 1,
        allocationCode: 1,
        status: 1,
        allocatedQuota: 1,
        completedCount: 1,
        startedCount: 1
      }
    }
  ]);

  return {
    allocationCount: byVendor.length,
    totalAllocatedQuota: byVendor.reduce((s, r) => s + (r.allocatedQuota ?? 0), 0),
    totalCompletes: byVendor.reduce((s, r) => s + (r.completedCount ?? 0), 0),
    totalStarts: byVendor.reduce((s, r) => s + (r.startedCount ?? 0), 0),
    allocations: byVendor.map((r) => ({
      vendorId: String(r._id),
      allocationCode: r.allocationCode,
      status: r.status,
      allocatedQuota: r.allocatedQuota,
      completedCount: r.completedCount,
      startedCount: r.startedCount
    }))
  };
}
