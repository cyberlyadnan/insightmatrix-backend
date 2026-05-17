import { Types } from "mongoose";
import { GatewayRoutingLog } from "../models/GatewayRoutingLog";
import type { GatewayRoutingAction, RoutingChannel } from "../constants/routing-gateway";

export type GatewayLogFilter = {
  channel?: RoutingChannel;
  action?: GatewayRoutingAction;
  panelSurveyId?: string;
  vendorId?: string;
  success?: boolean;
  page?: number;
  pageSize?: number;
};

function pageMeta(total: number, page: number, pageSize: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export const gatewayRoutingLogRepository = {
  create(payload: Record<string, unknown>) {
    return GatewayRoutingLog.create(payload);
  },

  async list(filter: GatewayLogFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
    const skip = (page - 1) * pageSize;
    const q: Record<string, unknown> = {};

    if (filter.channel) q.channel = filter.channel;
    if (filter.action) q.action = filter.action;
    if (filter.success !== undefined) q.success = filter.success;
    if (filter.panelSurveyId && Types.ObjectId.isValid(filter.panelSurveyId)) {
      q.panelSurveyId = new Types.ObjectId(filter.panelSurveyId);
    }
    if (filter.vendorId && Types.ObjectId.isValid(filter.vendorId)) {
      q.vendorId = new Types.ObjectId(filter.vendorId);
    }

    const [items, total] = await Promise.all([
      GatewayRoutingLog.find(q).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      GatewayRoutingLog.countDocuments(q)
    ]);

    return { items, meta: pageMeta(total, page, pageSize) };
  }
};
