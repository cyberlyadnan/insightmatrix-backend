import { Types } from "mongoose";
import { VendorSurveyAllocation } from "../models/VendorSurveyAllocation";
import type {
  VendorAllocationResponseStatus,
  VendorAllocationStatus
} from "../constants/vendor-allocation";

const PANEL_SURVEY_SAFE_POPULATE_FIELDS =
  "surveyName publicSurveyName surveyCode surveyStatus targetCountries targetGender targetAgeMin targetAgeMax targetProfessions targetIndustries targetCompanySizes targetDevices targetLanguages incidenceRate estimatedLOI totalQuota remainingQuota dynamicQuotaGroups startDate endDate notes";

export type VendorAllocationFilter = {
  panelSurveyId?: string;
  vendorId?: string;
  status?: VendorAllocationStatus;
  vendorResponseStatus?: VendorAllocationResponseStatus;
  search?: string;
  page?: number;
  pageSize?: number;
};

function pageMeta(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { page, pageSize, total, totalPages };
}

export const vendorAllocationRepository = {
  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return VendorSurveyAllocation.findById(id)
      .populate("panelSurveyId", PANEL_SURVEY_SAFE_POPULATE_FIELDS)
      .populate("vendorId", "vendorCode companyName status")
      .lean();
  },

  async findByCode(allocationCode: string) {
    const code = allocationCode.trim().toUpperCase();
    return VendorSurveyAllocation.findOne({ allocationCode: code })
      .populate("panelSurveyId")
      .populate("vendorId")
      .lean();
  },

  async findByRoutingSlug(routingSlug: string) {
    const slug = routingSlug.trim();
    if (!slug) return null;
    return VendorSurveyAllocation.findOne({ routingSlug: slug })
      .populate("panelSurveyId")
      .populate("vendorId")
      .lean();
  },

  /** Public routing lookup — slug only (legacy ALLOC-* codes rejected on public paths) */
  async findForPublicRouting(key: string) {
    return this.findByRoutingSlug(key);
  },

  async list(filter: VendorAllocationFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const q: Record<string, unknown> = {};
    if (filter.panelSurveyId && Types.ObjectId.isValid(filter.panelSurveyId)) {
      q.panelSurveyId = new Types.ObjectId(filter.panelSurveyId);
    }
    if (filter.vendorId && Types.ObjectId.isValid(filter.vendorId)) {
      q.vendorId = new Types.ObjectId(filter.vendorId);
    }
    if (filter.status) q.status = filter.status;
    const andClauses: Record<string, unknown>[] = [];
    if (filter.vendorResponseStatus) {
      if (filter.vendorResponseStatus === "pending") {
        andClauses.push({
          $or: [
            { vendorResponseStatus: "pending" },
            { vendorResponseStatus: { $exists: false } },
            { vendorResponseStatus: null }
          ]
        });
      } else {
        q.vendorResponseStatus = filter.vendorResponseStatus;
      }
    }
    if (filter.search?.trim()) {
      const s = filter.search.trim();
      andClauses.push({
        $or: [
          { allocationCode: { $regex: s, $options: "i" } },
          { routingSlug: { $regex: s, $options: "i" } },
          { notes: { $regex: s, $options: "i" } }
        ]
      });
    }
    if (andClauses.length > 0) {
      q.$and = andClauses;
    }

    const [items, total] = await Promise.all([
      VendorSurveyAllocation.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate("panelSurveyId", PANEL_SURVEY_SAFE_POPULATE_FIELDS)
        .populate("vendorId", "vendorCode companyName status")
        .lean(),
      VendorSurveyAllocation.countDocuments(q)
    ]);

    return { items, meta: pageMeta(total, page, pageSize) };
  },

  async sumAllocatedQuotaForSurvey(panelSurveyId: Types.ObjectId, excludeId?: Types.ObjectId) {
    const match: Record<string, unknown> = {
      panelSurveyId,
      status: { $in: ["active", "paused"] },
      vendorResponseStatus: { $ne: "rejected" }
    };
    if (excludeId) match._id = { $ne: excludeId };

    const agg = await VendorSurveyAllocation.aggregate<{ total: number }>([
      { $match: match },
      { $group: { _id: null, total: { $sum: "$allocatedQuota" } } }
    ]);
    return agg[0]?.total ?? 0;
  },

  create(payload: Record<string, unknown>) {
    return VendorSurveyAllocation.create(payload);
  },

  updateById(id: string, update: Record<string, unknown>) {
    return VendorSurveyAllocation.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate("panelSurveyId", PANEL_SURVEY_SAFE_POPULATE_FIELDS)
      .populate("vendorId", "vendorCode companyName status")
      .lean();
  },

  deleteById(id: string) {
    return VendorSurveyAllocation.findByIdAndDelete(id);
  },

  incrementCounters(
    id: Types.ObjectId,
    fields: Partial<{
      startedCount: number;
      completedCount: number;
      terminateCount: number;
      quotaFullCount: number;
      qualityRejectCount: number;
    }>
  ) {
    const inc: Record<string, number> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v && v > 0) inc[k] = v;
    }
    if (!Object.keys(inc).length) return Promise.resolve(null);
    return VendorSurveyAllocation.findByIdAndUpdate(id, { $inc: inc }, { new: true });
  }
};
