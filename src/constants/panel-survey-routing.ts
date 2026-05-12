/** Outcomes reported via supplier callbacks / internal logging */
export const PANEL_ROUTING_EVENT_TYPES = [
  "complete",
  "terminate",
  "screenout",
  "quota_full",
  "quality_reject",
  "duplicate"
] as const;

export type PanelRoutingEventType = (typeof PANEL_ROUTING_EVENT_TYPES)[number];
