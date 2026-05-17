import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { webhookDeliveryLogRepository } from "../repositories/webhook-delivery-log.repository";
import { gatewayRoutingLogRepository } from "../repositories/gateway-routing-log.repository";
import { toGatewayRoutingLogDto, toWebhookDeliveryLogDto } from "../utils/routing-logs.dto";

export const listWebhookDeliveryLogs = asyncHandler(async (req, res) => {
  const result = await webhookDeliveryLogRepository.list(req.validatedQuery ?? req.query);
  sendResponse(res, {
    data: result.items.map((item) => toWebhookDeliveryLogDto(item as Record<string, unknown>)),
    meta: result.meta
  });
});

export const listGatewayRoutingLogs = asyncHandler(async (req, res) => {
  const result = await gatewayRoutingLogRepository.list(req.validatedQuery ?? req.query);
  sendResponse(res, {
    data: result.items.map((item) => toGatewayRoutingLogDto(item as Record<string, unknown>)),
    meta: result.meta
  });
});
