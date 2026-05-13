export const PANEL_BOOK_ORG_TYPES = [
  "media_publisher",
  "brand_advertiser",
  "agency",
  "consultancy",
  "academic",
  "other"
] as const;

export type PanelBookOrgType = (typeof PANEL_BOOK_ORG_TYPES)[number];
