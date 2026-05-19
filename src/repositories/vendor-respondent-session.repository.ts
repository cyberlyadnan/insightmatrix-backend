import { Types } from "mongoose";
import { VendorRespondentSession } from "../models/VendorRespondentSession";
import type { VendorRespondentSessionStatus } from "../constants/vendor-allocation";

export type VendorRespondentSessionListFilter = {
  vendorId?: string;
  panelSurveyId?: string;
  allocationId?: string;
  status?: VendorRespondentSessionStatus;
  callbackForwarded?: boolean;
  search?: string;
  supplierProjectPid?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

function pageMeta(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { page, pageSize, total, totalPages };
}

export const vendorRespondentSessionRepository = {
  findByToken(sessionToken: string) {
    const token = sessionToken.trim();
    return VendorRespondentSession.findOne({
      $or: [{ sessionToken: token }, { internalSessionToken: token }]
    }).lean();
  },

  findByInternalToken(internalSessionToken: string) {
    const token = internalSessionToken.trim();
    return VendorRespondentSession.findOne({
      $or: [{ internalSessionToken: token }, { sessionToken: token }]
    }).lean();
  },

  findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return VendorRespondentSession.findById(id).lean();
  },

  create(payload: Record<string, unknown>) {
    return VendorRespondentSession.create(payload);
  },

  updateStatus(
    id: Types.ObjectId,
    status: VendorRespondentSessionStatus,
    extra?: {
      redirectedAt?: Date;
      completedAt?: Date;
      responseStatus?: VendorRespondentSessionStatus;
      supplierReturnedToken?: string;
      callbackForwarded?: boolean;
      callbackForwardedAt?: Date;
    }
  ) {
    const $set: Record<string, unknown> = { status, ...extra };
    if (extra?.responseStatus) {
      $set.responseStatus = extra.responseStatus;
    } else if (status) {
      $set.responseStatus = status;
    }
    return VendorRespondentSession.findByIdAndUpdate(id, { $set }, { new: true });
  },

  markCallbackForwarded(id: Types.ObjectId, forwarded: boolean) {
    return VendorRespondentSession.findByIdAndUpdate(
      id,
      {
        $set: {
          callbackForwarded: forwarded,
          callbackForwardedAt: forwarded ? new Date() : null
        }
      },
      { new: true }
    );
  },

  countRedirectsForAllocation(allocationId: Types.ObjectId) {
    return VendorRespondentSession.countDocuments({
      allocationId,
      status: { $in: ["redirected", "complete", "terminate", "quota_full", "quality_reject"] }
    });
  },

  async list(filter: VendorRespondentSessionListFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const q: Record<string, unknown> = {};

    if (filter.vendorId && Types.ObjectId.isValid(filter.vendorId)) {
      q.vendorId = new Types.ObjectId(filter.vendorId);
    }
    if (filter.panelSurveyId && Types.ObjectId.isValid(filter.panelSurveyId)) {
      q.panelSurveyId = new Types.ObjectId(filter.panelSurveyId);
    }
    if (filter.allocationId && Types.ObjectId.isValid(filter.allocationId)) {
      q.allocationId = new Types.ObjectId(filter.allocationId);
    }
    if (filter.status) q.status = filter.status;
    if (filter.callbackForwarded !== undefined) {
      q.callbackForwarded = filter.callbackForwarded;
    }
    if (filter.supplierProjectPid?.trim()) {
      q.supplierProjectPid = filter.supplierProjectPid.trim();
    }
    if (filter.search?.trim()) {
      const s = filter.search.trim();
      q.$or = [
        { vendorRespondentToid: { $regex: s, $options: "i" } },
        { internalSessionToken: { $regex: s, $options: "i" } },
        { sessionToken: { $regex: s, $options: "i" } },
        { supplierReturnedToken: { $regex: s, $options: "i" } },
        { vendorRespondentId: { $regex: s, $options: "i" } }
      ];
    }
    if (filter.dateFrom || filter.dateTo) {
      q.createdAt = {};
      if (filter.dateFrom) {
        (q.createdAt as Record<string, Date>).$gte = new Date(filter.dateFrom);
      }
      if (filter.dateTo) {
        const end = new Date(filter.dateTo);
        end.setHours(23, 59, 59, 999);
        (q.createdAt as Record<string, Date>).$lte = end;
      }
    }

    const [items, total] = await Promise.all([
      VendorRespondentSession.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate("vendorId", "vendorCode companyName")
        .populate("panelSurveyId", "surveyName surveyCode")
        .populate("allocationId", "allocationCode routingSlug")
        .lean(),
      VendorRespondentSession.countDocuments(q)
    ]);

    return { items, meta: pageMeta(total, page, pageSize) };
  }
};
