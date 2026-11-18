import { Types } from "mongoose";
import { ApiError } from "../utils/ApiError";
import { VendorSurveyAllocation } from "../models/VendorSurveyAllocation";
import { vendorRepository } from "../repositories/vendor.repository";
import { fetchVendorLevelAnalytics } from "./vendor-allocation/allocation-analytics.service";
import { toVendorDashboardSummary, toVendorPublicProfile } from "../utils/vendor.dto";
import type { VendorCallbackUrls } from "../types/vendor-callback";
import { normalizeVendorCallbackUrls } from "../utils/vendor-callback";
import {
  fetchVendorDashboardStatsForRange,
  fetchVendorHourlyReport,
  type DateRangeInput,
  type VendorHourlyReportParams
} from "./vendor-portal-reports.service";

export const vendorPortalService = {
  getProfile: async (vendorId: string) => {
    const doc = await vendorRepository.findById(vendorId);
    if (!doc) throw new ApiError(404, "Vendor not found");
    return toVendorPublicProfile(doc);
  },

  updateProfile: async (
    vendorId: string,
    payload: {
      companyName?: string;
      contactPerson?: string;
      phone?: string;
      website?: string;
      callbackUrls?: Partial<VendorCallbackUrls>;
    }
  ) => {
    const update: Record<string, unknown> = {};
    if (payload.companyName !== undefined) update.companyName = payload.companyName.trim();
    if (payload.contactPerson !== undefined) update.contactPerson = payload.contactPerson.trim();
    if (payload.phone !== undefined) update.phone = payload.phone.trim();
    if (payload.website !== undefined) update.website = payload.website.trim();
    if (payload.callbackUrls !== undefined) {
      update.callbackUrls = normalizeVendorCallbackUrls(payload.callbackUrls);
    }

    const doc = await vendorRepository.updateById(vendorId, update);
    if (!doc) throw new ApiError(404, "Vendor not found");
    return toVendorPublicProfile(doc);
  },

  getDashboardSummary: async (vendorId: string, range?: DateRangeInput) => {
    const doc = await vendorRepository.findById(vendorId);
    if (!doc) throw new ApiError(404, "Vendor not found");
    const base = toVendorDashboardSummary(doc);

    // If a date/hour range filter is active, compute exact metrics from sessions in that window
    if (range?.dateFrom || range?.dateTo) {
      const rangeStats = await fetchVendorDashboardStatsForRange(vendorId, range);
      return {
        ...base,
        ...rangeStats
      };
    }

    const vid = new Types.ObjectId(vendorId);
    const [stats, activeAssignments] = await Promise.all([
      fetchVendorLevelAnalytics(vendorId).catch(() => null),
      VendorSurveyAllocation.countDocuments({
        vendorId: vid,
        status: "active",
        vendorResponseStatus: { $ne: "rejected" }
      })
    ]);

    if (!stats) {
      return { ...base, activeAssignments };
    }

    const sessions =
      stats.completedCount + stats.terminateCount + stats.quotaFullCount + stats.qualityRejectCount;

    return {
      ...base,
      activeAssignments,
      totalStarts: stats.startedCount,
      totalCompletes: stats.completedCount,
      totalTerminates: stats.terminateCount,
      totalQuotaFull: stats.quotaFullCount,
      totalQualityRejects: stats.qualityRejectCount,
      conversionRate: stats.conversionRate,
      terminationRate:
        sessions > 0 ? Math.round((stats.terminateCount / sessions) * 10000) / 100 : 0
    };
  },

  getHourlyReport: async (vendorId: string, params: VendorHourlyReportParams) => {
    return fetchVendorHourlyReport(vendorId, params);
  }
};
