import type { VendorCallbackOutcome } from "../../constants/vendor-callback";
import type { VendorCallbackWebhookLogEntry } from "../../types/vendor-callback";

/** Future retry queue job — not persisted yet. */
export type VendorCallbackRetryJob = {
  id: string;
  vendorId: string;
  outcome: VendorCallbackOutcome;
  targetUrl: string;
  payload: Record<string, unknown>;
  attempt: number;
  maxAttempts: number;
  scheduledAt: string;
};

/**
 * Future: append-only webhook delivery log + retry scheduler.
 * Do not implement sending/queues in foundation phase.
 */
export interface IVendorCallbackWebhookLogService {
  listByVendor(vendorId: string, limit?: number): Promise<VendorCallbackWebhookLogEntry[]>;
  enqueueRetry(job: Omit<VendorCallbackRetryJob, "id" | "scheduledAt">): Promise<VendorCallbackRetryJob>;
}
