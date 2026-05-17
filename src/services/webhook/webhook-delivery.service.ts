import { WEBHOOK_DEFAULT_TIMEOUT_MS } from "../../constants/routing-gateway";
import type { VendorCallbackOutcome } from "../../constants/vendor-callback";
import type { WebhookDeliveryStatus } from "../../constants/routing-gateway";
import { webhookDeliveryLogRepository } from "../../repositories/webhook-delivery-log.repository";
import { Types } from "mongoose";

export type WebhookSendInput = {
  vendorId: Types.ObjectId | string;
  panelSurveyId: Types.ObjectId | string;
  allocationId?: Types.ObjectId | string | null;
  sessionId?: Types.ObjectId | string | null;
  callbackType: VendorCallbackOutcome;
  destinationUrl: string;
  requestPayload: Record<string, unknown>;
  timeoutMs?: number;
};

export type WebhookSendResult = {
  deliveryStatus: WebhookDeliveryStatus;
  responseStatus: number | null;
  responsePayload: string;
  errorMessage: string;
  logId: string | null;
};

function truncate(text: string, max = 16000): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * Sends outbound webhook with timeout, always persists WebhookDeliveryLog.
 * Never throws — safe to call from callback pipeline.
 */
export async function deliverWebhook(input: WebhookSendInput): Promise<WebhookSendResult> {
  const timeoutMs = input.timeoutMs ?? WEBHOOK_DEFAULT_TIMEOUT_MS;
  const destinationUrl = input.destinationUrl.trim();

  let responseStatus: number | null = null;
  let responsePayload = "";
  let errorMessage = "";
  let deliveryStatus: WebhookDeliveryStatus = "failed";

  if (!destinationUrl) {
    errorMessage = "Empty destination URL";
  } else {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(destinationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "InsightMatrix-Routing/1.0"
        },
        body: JSON.stringify(input.requestPayload),
        signal: controller.signal
      });

      clearTimeout(timer);
      responseStatus = res.status;
      responsePayload = truncate(await res.text().catch(() => ""));

      if (res.ok) {
        deliveryStatus = "success";
      } else {
        errorMessage = `HTTP ${res.status}`;
      }
    } catch (err) {
      errorMessage =
        err instanceof Error
          ? err.name === "AbortError"
            ? `Request timed out after ${timeoutMs}ms`
            : err.message
          : "Webhook request failed";
    }
  }

  let logId: string | null = null;
  try {
    const log = await webhookDeliveryLogRepository.create({
      vendorId: new Types.ObjectId(String(input.vendorId)),
      panelSurveyId: new Types.ObjectId(String(input.panelSurveyId)),
      allocationId: input.allocationId
        ? new Types.ObjectId(String(input.allocationId))
        : null,
      sessionId: input.sessionId ? new Types.ObjectId(String(input.sessionId)) : null,
      callbackType: input.callbackType,
      destinationUrl,
      requestPayload: input.requestPayload,
      responseStatus,
      responsePayload,
      deliveryStatus,
      errorMessage: errorMessage.slice(0, 2000),
      attemptedAt: new Date()
    });
    logId = String(log._id);
  } catch {
    /* log persistence failure must not break flow */
  }

  return {
    deliveryStatus,
    responseStatus,
    responsePayload,
    errorMessage,
    logId
  };
}

export const webhookDeliveryService = {
  deliverWebhook
};
