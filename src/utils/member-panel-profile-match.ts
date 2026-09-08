import type { PanelSurveyGenderTarget } from "../constants/panel-survey";

/** Values align with `buildMemberPanelQuestions` ids / option values in member-panel-questions.ts */
export type MemberPanelProfile = {
  ageMin: number | null;
  ageMax: number | null;
  gender: string | null;
  countryCode: string | null;
  employment: string | null;
  industry: string | null;
  devices: string[];
};

function val(answers: Record<string, unknown>, suffix: string): unknown {
  const key = Object.keys(answers).find((k) => k.endsWith(suffix));
  return key ? answers[key] : undefined;
}

function ageBandToRange(band: string): { min: number; max: number } | null {
  const b = String(band).trim();
  if (b === "18_24") return { min: 18, max: 24 };
  if (b === "25_34") return { min: 25, max: 34 };
  if (b === "35_44") return { min: 35, max: 44 };
  if (b === "45_54") return { min: 45, max: 54 };
  if (b === "55_plus") return { min: 55, max: 120 };
  return null;
}

/** Normalize country codes so UK/GB and legacy lowercase values still match. */
export function normalizeCountryCode(raw: string | null | undefined): string | null {
  if (raw == null || String(raw).trim() === "") return null;
  const c = String(raw).trim().toUpperCase();
  if (c === "UK" || c === "GBR") return "GB";
  if (c === "OTHER" || c === "XX") return null;
  return c;
}

/**
 * Expand industry tokens so legacy prescreen values (tech/health/gov)
 * still match admin targeting (technology/healthcare/government).
 */
export function expandIndustryTokens(industry: string | null | undefined): string[] {
  if (!industry) return [];
  const i = industry.trim().toLowerCase();
  const map: Record<string, string[]> = {
    tech: ["tech", "technology", "saas", "enterprise_software", "it"],
    technology: ["tech", "technology", "saas", "enterprise_software", "it"],
    saas: ["saas", "technology", "tech", "enterprise_software"],
    enterprise_software: ["enterprise_software", "saas", "technology", "tech"],
    health: ["health", "healthcare"],
    healthcare: ["health", "healthcare"],
    gov: ["gov", "government"],
    government: ["gov", "government"],
    finance: ["finance", "banking"],
    banking: ["finance", "banking"],
    mfg: ["mfg", "manufacturing"],
    manufacturing: ["mfg", "manufacturing"],
    retail: ["retail", "cpg"],
    cpg: ["retail", "cpg"],
    media: ["media"],
    education: ["education"],
    hospitality: ["hospitality"],
    other: ["other"]
  };
  return map[i] ?? [i];
}

export function parseMemberPanelProfileFromAnswers(answers: Record<string, unknown>): MemberPanelProfile {
  const ageRaw = val(answers, "_q_age");
  const ar = ageRaw != null ? ageBandToRange(String(ageRaw)) : null;

  const genderRaw = val(answers, "_q_gender");
  const gender = genderRaw != null ? String(genderRaw).trim().toLowerCase() : null;

  const countryRaw = val(answers, "_q_country");
  const countryCode = normalizeCountryCode(
    countryRaw != null ? String(countryRaw) : null
  );

  const employmentRaw = val(answers, "_q_employment");
  const employment = employmentRaw != null ? String(employmentRaw).trim() : null;

  const industryRaw = val(answers, "_q_industry");
  const industry = industryRaw != null ? String(industryRaw).trim().toLowerCase() : null;

  const devicesRaw = val(answers, "_q_devices");
  const devices = Array.isArray(devicesRaw)
    ? devicesRaw.map((d) => String(d).trim().toLowerCase()).filter(Boolean)
    : [];

  return {
    ageMin: ar?.min ?? null,
    ageMax: ar?.max ?? null,
    gender,
    countryCode,
    employment,
    industry,
    devices
  };
}

function prescreenDevicesToPanelDevices(devices: string[]): string[] {
  const out = new Set<string>();
  for (const d of devices) {
    if (d === "smartphone") out.add("mobile");
    if (d === "tablet") out.add("tablet");
    if (d === "computer") out.add("desktop");
    if (d === "tv") {
      out.add("desktop");
      out.add("mobile");
    }
  }
  return [...out];
}

function employmentToProfessionTokens(employment: string | null): string[] {
  if (!employment) return [];
  const e = employment.toLowerCase();
  const tokens = new Set<string>();
  tokens.add(e);
  if (e === "full_time") {
    tokens.add("employed_full_time");
    tokens.add("full_time");
  }
  if (e === "part_time") {
    tokens.add("part_time");
    tokens.add("employed_part_time");
  }
  if (e === "student") tokens.add("student");
  if (e === "self_employed") {
    tokens.add("self_employed");
    tokens.add("freelancer");
  }
  if (e === "other_ne") {
    tokens.add("homemaker");
    tokens.add("retired");
    tokens.add("unemployed");
  }
  return [...tokens];
}

function genderMatches(surveyGender: PanelSurveyGenderTarget, userGender: string | null): boolean {
  if (surveyGender === "all") return true;
  if (!userGender) return false;
  if (surveyGender === "male" && userGender === "male") return true;
  if (surveyGender === "female" && userGender === "female") return true;
  if (surveyGender === "other" && (userGender === "non_binary" || userGender === "prefer_not")) return true;
  return false;
}

function ageOverlaps(
  userMin: number | null,
  userMax: number | null,
  surveyMin: number | null,
  surveyMax: number | null
): boolean {
  if (surveyMin == null && surveyMax == null) return true;
  if (userMin == null || userMax == null) return false;
  const smin = surveyMin ?? 0;
  const smax = surveyMax ?? 120;
  return userMax >= smin && userMin <= smax;
}

function listOverlap(surveyList: string[], userTokens: string[]): boolean {
  if (!surveyList.length) return true;
  if (!userTokens.length) return false;
  const lowerSurvey = surveyList.map((s) => s.toLowerCase());
  return userTokens.some((t) => lowerSurvey.includes(t.toLowerCase()));
}

export function surveyMatchesMemberProfile(
  survey: {
    targetCountries?: string[];
    targetGender?: PanelSurveyGenderTarget;
    targetAgeMin?: number | null;
    targetAgeMax?: number | null;
    targetProfessions?: string[];
    targetIndustries?: string[];
    targetDevices?: string[];
  },
  profile: MemberPanelProfile
): boolean {
  const countries = (survey.targetCountries ?? [])
    .map((c) => normalizeCountryCode(c))
    .filter((c): c is string => Boolean(c));
  if (countries.length > 0) {
    const cc = profile.countryCode;
    if (!cc) return false;
    if (!countries.includes(cc)) return false;
  }

  if (!genderMatches((survey.targetGender ?? "all") as PanelSurveyGenderTarget, profile.gender)) {
    return false;
  }

  if (
    !ageOverlaps(profile.ageMin, profile.ageMax, survey.targetAgeMin ?? null, survey.targetAgeMax ?? null)
  ) {
    return false;
  }

  const profTokens = employmentToProfessionTokens(profile.employment);
  if (!listOverlap(survey.targetProfessions ?? [], profTokens)) return false;

  const industryTokens = expandIndustryTokens(profile.industry);
  if (!listOverlap(survey.targetIndustries ?? [], industryTokens)) return false;

  const surveyDevices = survey.targetDevices ?? [];
  if (surveyDevices.length > 0) {
    const userPanelDevices = prescreenDevicesToPanelDevices(profile.devices);
    if (!userPanelDevices.length) return false;
    const ok = userPanelDevices.some((d) => surveyDevices.includes(d as never));
    if (!ok) return false;
  }

  return true;
}

export function pointsFromPayout(payoutToUser: number | null | undefined): number {
  const n = Number(payoutToUser);
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.max(50, Math.round(n * 100));
}
