import { Types } from "mongoose";
import { SecurityValidationLog } from "../models/SecurityValidationLog";

export type SecurityLogFilter = {
  vendorId?: string;
  panelSurveyId?: string;
  allocationId?: string;
  validationDecision?: string;
  reasonCode?: string;
  country?: string;
  ipAddress?: string;
  botDetected?: boolean;
  vpnDetected?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

function pageMeta(total: number, page: number, pageSize: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export const securityValidationLogRepository = {
  async list(filter: SecurityLogFilter) {
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
    if (filter.validationDecision) q.validationDecision = filter.validationDecision;
    if (filter.reasonCode) q.reasonCode = filter.reasonCode;
    if (filter.country) q.country = filter.country.toUpperCase();
    if (filter.ipAddress) q.ipAddress = filter.ipAddress;
    if (filter.botDetected !== undefined) q.botDetected = filter.botDetected;
    if (filter.vpnDetected !== undefined) q.vpnDetected = filter.vpnDetected;
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
      SecurityValidationLog.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate("vendorId", "vendorCode companyName")
        .populate("panelSurveyId", "surveyName surveyCode")
        .lean(),
      SecurityValidationLog.countDocuments(q)
    ]);

    return { items, meta: pageMeta(total, page, pageSize) };
  },

  async analyticsSummary(filter: Pick<SecurityLogFilter, "dateFrom" | "dateTo" | "vendorId" | "panelSurveyId">) {
    const q: Record<string, unknown> = {};
    if (filter.vendorId && Types.ObjectId.isValid(filter.vendorId)) {
      q.vendorId = new Types.ObjectId(filter.vendorId);
    }
    if (filter.panelSurveyId && Types.ObjectId.isValid(filter.panelSurveyId)) {
      q.panelSurveyId = new Types.ObjectId(filter.panelSurveyId);
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

    const [total, blocked, captchaFailed, botHits, vpnHits, byCountry] = await Promise.all([
      SecurityValidationLog.countDocuments(q),
      SecurityValidationLog.countDocuments({ ...q, validationDecision: "block" }),
      SecurityValidationLog.countDocuments({ ...q, reasonCode: "captcha_failed" }),
      SecurityValidationLog.countDocuments({ ...q, botDetected: true }),
      SecurityValidationLog.countDocuments({ ...q, vpnDetected: true }),
      SecurityValidationLog.aggregate([
        { $match: q },
        { $group: { _id: "$country", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ])
    ]);

    const blockRate = total > 0 ? Math.round((blocked / total) * 10000) / 100 : 0;

    return {
      total,
      blocked,
      blockRate,
      captchaFailureRate: total > 0 ? Math.round((captchaFailed / total) * 10000) / 100 : 0,
      botTrafficRate: total > 0 ? Math.round((botHits / total) * 10000) / 100 : 0,
      vpnTrafficRate: total > 0 ? Math.round((vpnHits / total) * 10000) / 100 : 0,
      countryDistribution: byCountry.map((r) => ({
        country: String(r._id || "—"),
        count: r.count as number
      }))
    };
  }
};
