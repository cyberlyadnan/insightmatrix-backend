/** Core demographic questions used for survey matching — cannot be removed from the panel profile. */

export const MEMBER_PANEL_LOCKED_SUFFIXES = [
  "_q_age",
  "_q_gender",
  "_q_country",
  "_q_employment",
  "_q_industry",
  "_q_devices"
] as const;

export type MemberPanelLockedSuffix = (typeof MEMBER_PANEL_LOCKED_SUFFIXES)[number];

export function isLockedMemberPanelQuestionId(id: string): boolean {
  return MEMBER_PANEL_LOCKED_SUFFIXES.some((suffix) => id.endsWith(suffix));
}

export function lockedQuestionLabel(id: string): string {
  if (id.endsWith("_q_age")) return "Age range";
  if (id.endsWith("_q_gender")) return "Gender";
  if (id.endsWith("_q_country")) return "Country";
  if (id.endsWith("_q_employment")) return "Employment status";
  if (id.endsWith("_q_industry")) return "Industry";
  if (id.endsWith("_q_devices")) return "Devices";
  return "Required matching field";
}
