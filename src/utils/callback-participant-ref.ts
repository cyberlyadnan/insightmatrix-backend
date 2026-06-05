import type { PanelRoutingEventType } from "../constants/panel-survey-routing";

const PARTICIPANT_REF_KEYS = [
  "im_attempt",
  "toid",
  "uid",
  "RID",
  "rid",
  "txn",
  "transaction_id",
  "subid",
  "token"
] as const;

/** Extract respondent / session ref from callback payload or embedded query meta */
export function extractSupplierParticipantRef(input: {
  supplierParticipantRef?: string | null;
  meta?: unknown;
}): string {
  const direct = String(input.supplierParticipantRef ?? "").trim();
  if (direct) return direct;

  if (!input.meta || typeof input.meta !== "object" || !("query" in input.meta)) {
    return "";
  }

  const query = (input.meta as { query?: Record<string, unknown> }).query ?? {};
  for (const key of PARTICIPANT_REF_KEYS) {
    const value = String(query[key] ?? "").trim();
    if (value) return value;
  }

  return "";
}

/** Map supplier routing events to respondent lifecycle terminal statuses */
export function routingEventToRespondentStatus(
  eventType: PanelRoutingEventType
): string | null {
  switch (eventType) {
    case "complete":
      return "complete";
    case "terminate":
    case "screenout":
      return "terminate";
    case "quota_full":
      return "quota_full";
    case "quality_reject":
      return "quality_reject";
    default:
      return null;
  }
}
