/** Traffic channels through the unified routing gateway */
export const ROUTING_CHANNELS = ["panel", "vendor"] as const;
export type RoutingChannel = (typeof ROUTING_CHANNELS)[number];

export const GATEWAY_ROUTING_ACTIONS = [
  "start_validation",
  "redirect_success",
  "validation_failed",
  "prescreen_required",
  "callback_received",
  "callback_forwarded",
  "callback_forward_skipped"
] as const;
export type GatewayRoutingAction = (typeof GATEWAY_ROUTING_ACTIONS)[number];

export const WEBHOOK_DELIVERY_STATUSES = ["success", "failed"] as const;
export type WebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUSES)[number];

/** Default outbound webhook timeout (ms) */
export const WEBHOOK_DEFAULT_TIMEOUT_MS = 10_000;
