import { Types } from "mongoose";
import { WebhookDeliveryLog } from "../models/WebhookDeliveryLog";
import type { VendorCallbackOutcome } from "../constants/vendor-callback";
import type { WebhookDeliveryStatus } from "../constants/routing-gateway";

export type WebhookLogFilter = {
  vendorId?: string;
  panelSurveyId?: string;
  allocationId?: string;
  deliveryStatus?: WebhookDeliveryStatus;
  callbackType?: VendorCallbackOutcome;
  page?: number;
  pageSize?: number;
};

function pageMeta(total: number, page: number, pageSize: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export const webhookDeliveryLogRepository = {
  create(payload: Record<string, unknown>) {
    return WebhookDeliveryLog.create(payload);
  },

  async list(filter: WebhookLogFilter) {
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
    if (filter.deliveryStatus) q.deliveryStatus = filter.deliveryStatus;
    if (filter.callbackType) q.callbackType = filter.callbackType;

    const [items, total] = await Promise.all([
      WebhookDeliveryLog.find(q)
        .sort({ attemptedAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate("vendorId", "vendorCode companyName")
        .populate("panelSurveyId", "surveyName surveyCode")
        .lean(),
      WebhookDeliveryLog.countDocuments(q)
    ]);

    return { items, meta: pageMeta(total, page, pageSize) };
  }
};
