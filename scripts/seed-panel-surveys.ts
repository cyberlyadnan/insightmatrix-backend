import "dotenv/config";
import { connectDatabase } from "../src/database/mongo";
import { SurveyCompany } from "../src/models/SurveyCompany";
import { PanelSurvey } from "../src/models/PanelSurvey";
import { extractSupplierProjectPidFromUrl } from "../src/utils/supplier-survey-url";

/**
 * Diverse routing surveys for QA: targeting, quotas, tracking keys, and participant URL keys.
 * Run after `npm run seed:survey-providers`.
 *
 * Public landing only serves surveys with surveyStatus `active`.
 */

const SEED_SURVEYS = [
  /**
   * Broad-match QA survey: no country / age / profession / industry / device filters in
   * `surveyMatchesMemberProfile` — any member with a completed required prescreen should see it.
   * Use to verify dashboard → surveys → start page. URL must include `pid=` for supplierProjectPid.
   */
  {
    surveyCode: "IM_PANEL_OPEN_QA",
    providerCompanyCode: "DYNATA",
    surveyName: "[QA] Open panel study — test flow to start page",
    externalSurveyId: "EXT-IM-PANEL-OPEN-QA",
    surveyStatus: "active" as const,
    externalSurveyUrl:
      "https://example.com/panel-qa/open-study?wave=qa&pid=IM_PANEL_OPEN_QA_PID",
    trackingParameterName: "toid",
    participantQueryParam: "pid",
    targetCountries: [],
    targetGender: "all" as const,
    targetAgeMin: null,
    targetAgeMax: null,
    targetProfessions: [],
    targetIndustries: [],
    targetCompanySizes: [],
    targetDevices: [],
    targetLanguages: [],
    incidenceRate: 90,
    estimatedLOI: 3,
    payoutToUser: 1.0,
    revenuePerComplete: 2.0,
    totalQuota: 50_000,
    remainingQuota: 49_999,
    surveyPriority: 999,
    notes:
      "Seed: open targeting for QA — appears for almost all panel members; example.com destination for safe testing.",
    dynamicQuotaGroups: [
      {
        groupName: "QA — open completes",
        groupDescription: "Catch-all quota for manual testing",
        totalQuota: 50_000,
        remainingQuota: 49_999,
        status: "active" as const
      }
    ]
  },
  {
    surveyCode: "IM_RETAIL_TRACKER_Q2",
    providerCompanyCode: "DYNATA",
    surveyName: "US Retail attitudes — weekly tracker",
    externalSurveyId: "EXT-DYN-88421",
    surveyStatus: "active" as const,
    externalSurveyUrl:
      "https://example.com/vendor-surveys/retail-tracker?wave=q2&region=us&pid=IM_RET_US_Q2",
    trackingParameterName: "toid",
    participantQueryParam: "pid",
    targetCountries: ["US"],
    targetGender: "all" as const,
    targetAgeMin: 21,
    targetAgeMax: 65,
    targetProfessions: ["employed_full_time", "part_time"],
    targetIndustries: ["retail", "cpg"],
    targetCompanySizes: ["11-50", "51-200"],
    targetDevices: ["desktop", "mobile"],
    targetLanguages: ["en"],
    incidenceRate: 35,
    estimatedLOI: 12,
    payoutToUser: 2.75,
    revenuePerComplete: 4.2,
    totalQuota: 2400,
    remainingQuota: 2100,
    surveyPriority: 10,
    notes: "Seed: primary US consumer path; Dynata standard toid echo.",
    dynamicQuotaGroups: [
      {
        groupName: "Gen pop — national",
        groupDescription: "Representative US adults",
        totalQuota: 1200,
        remainingQuota: 1000,
        status: "active" as const
      },
      {
        groupName: "Parents HH income $75k+",
        groupDescription: "Quota slice for premium SKU questions",
        totalQuota: 600,
        remainingQuota: 450,
        status: "active" as const
      },
      {
        groupName: "Weekly buyers — soft drinks",
        groupDescription: "Category overlay",
        totalQuota: 600,
        remainingQuota: 520,
        status: "paused" as const
      }
    ]
  },
  {
    surveyCode: "IM_LUXURY_GLOBAL_HUB",
    providerCompanyCode: "LUCID",
    surveyName: "Global luxury purchase intent — multi-market",
    externalSurveyId: "LUCID-STUDY-99201",
    surveyStatus: "active" as const,
    externalSurveyUrl:
      "https://example.com/routing/luxury-intent?wave=2026a&pid=IM_LUX_GL_01",
    trackingParameterName: "RID",
    participantQueryParam: "uid",
    targetCountries: ["GB", "FR", "DE", "US"],
    targetGender: "all" as const,
    targetAgeMin: 25,
    targetAgeMax: 55,
    targetProfessions: [],
    targetIndustries: ["luxury_goods", "fashion"],
    targetCompanySizes: [],
    targetDevices: ["mobile", "tablet", "desktop"],
    targetLanguages: ["en", "fr", "de"],
    incidenceRate: 12,
    estimatedLOI: 18,
    payoutToUser: 5.5,
    revenuePerComplete: 9.0,
    totalQuota: 900,
    remainingQuota: 820,
    surveyPriority: 20,
    notes: "Seed: Lucid-style RID; landing expects uid= from marketplace.",
    dynamicQuotaGroups: [
      {
        groupName: "UK + FR — female skew",
        groupDescription: "Feminine luxury skew markets",
        totalQuota: 400,
        remainingQuota: 380,
        status: "active" as const
      },
      {
        groupName: "DE + US — male skew",
        groupDescription: "Male accessory buyers",
        totalQuota: 500,
        remainingQuota: 440,
        status: "active" as const
      }
    ]
  },
  {
    surveyCode: "IM_B2B_SAAS_ROUTER",
    providerCompanyCode: "PURESPEC",
    surveyName: "B2B SaaS decision-makers — IT security",
    externalSurveyId: "PS-SVY-44002",
    surveyStatus: "active" as const,
    externalSurveyUrl:
      "https://example.com/b2b-entry?vertical=security&im=1&pid=IM_B2B_SEC_44002",
    trackingParameterName: "subid",
    participantQueryParam: "pid",
    targetCountries: ["US", "CA", "AU"],
    targetGender: "all" as const,
    targetAgeMin: 30,
    targetAgeMax: null,
    targetProfessions: ["it", "security", "operations"],
    targetIndustries: ["saas", "enterprise_software"],
    targetCompanySizes: ["201-1000", "1000+"],
    targetDevices: ["desktop"],
    targetLanguages: ["en"],
    incidenceRate: 8,
    estimatedLOI: 22,
    payoutToUser: 12.0,
    revenuePerComplete: 22.5,
    totalQuota: 350,
    remainingQuota: 310,
    surveyPriority: 30,
    notes: "Seed: router subid; desktop-heavy professional incidence.",
    dynamicQuotaGroups: [
      {
        groupName: "Enterprise 1000+",
        groupDescription: "Named accounts quota",
        totalQuota: 120,
        remainingQuota: 95,
        status: "active" as const
      },
      {
        groupName: "Mid-market",
        groupDescription: "200–999 employees",
        totalQuota: 150,
        remainingQuota: 140,
        status: "active" as const
      },
      {
        groupName: "Small business overlay",
        groupDescription: "SMB security buyers",
        totalQuota: 80,
        remainingQuota: 75,
        status: "filled" as const
      }
    ]
  },
  {
    surveyCode: "IM_HEALTH_QUICK_POLL",
    providerCompanyCode: "TOLUNA",
    surveyName: "Health & wellness — 5 minute pulse",
    externalSurveyId: "TOL-HWP-1188",
    surveyStatus: "active" as const,
    externalSurveyUrl:
      "https://example.com/health/pulse?study=toluna_seed&pid=IM_HEALTH_MX_BR_ES",
    trackingParameterName: "tid",
    participantQueryParam: "pid",
    targetCountries: ["MX", "BR", "ES"],
    targetGender: "all" as const,
    targetAgeMin: 18,
    targetAgeMax: 70,
    targetProfessions: [],
    targetIndustries: [],
    targetCompanySizes: [],
    targetDevices: ["mobile"],
    targetLanguages: ["es", "pt"],
    incidenceRate: 45,
    estimatedLOI: 5,
    payoutToUser: 0.85,
    revenuePerComplete: 1.4,
    totalQuota: 5000,
    remainingQuota: 4800,
    surveyPriority: 5,
    notes: "Seed: high incidence LOI; mobile-only routing.",
    dynamicQuotaGroups: [
      {
        groupName: "MX — Spanish",
        groupDescription: "Mexico Spanish completes",
        totalQuota: 2500,
        remainingQuota: 2400,
        status: "active" as const
      },
      {
        groupName: "BR — Portuguese",
        groupDescription: "Brazil completes",
        totalQuota: 1500,
        remainingQuota: 1450,
        status: "active" as const
      },
      {
        groupName: "ES — Spanish EU",
        groupDescription: "Spain completes",
        totalQuota: 1000,
        remainingQuota: 950,
        status: "active" as const
      }
    ]
  },
  {
    surveyCode: "IM_AUTO_EV_CONCEPT",
    providerCompanyCode: "IPSOS_DIG",
    surveyName: "Automotive EV concept — premium SUV",
    externalSurveyId: "IPSOS-AUTO-772",
    surveyStatus: "active" as const,
    externalSurveyUrl:
      "https://example.com/auto/ev-concept?wave=suv_v3&pid=IM_AUTO_EV_SUV3",
    trackingParameterName: "uid",
    participantQueryParam: "pid",
    targetCountries: ["US", "DE", "CN"],
    targetGender: "all" as const,
    targetAgeMin: 28,
    targetAgeMax: 60,
    targetProfessions: [],
    targetIndustries: ["automotive"],
    targetCompanySizes: [],
    targetDevices: ["desktop", "tablet", "mobile"],
    targetLanguages: ["en", "de", "zh"],
    incidenceRate: 18,
    estimatedLOI: 25,
    payoutToUser: 8.25,
    revenuePerComplete: 14.0,
    totalQuota: 1200,
    remainingQuota: 1150,
    surveyPriority: 15,
    notes: "Seed: multi-language auto; completes via uid on supplier side.",
    dynamicQuotaGroups: [
      {
        groupName: "US — intenders",
        groupDescription: "Plan to purchase SUV in 24 mo",
        totalQuota: 500,
        remainingQuota: 480,
        status: "active" as const
      },
      {
        groupName: "DE — premium buyers",
        groupDescription: "German premium segment",
        totalQuota: 400,
        remainingQuota: 390,
        status: "active" as const
      },
      {
        groupName: "CN — tier-1 cities",
        groupDescription: "Shanghai / Beijing overlay",
        totalQuota: 300,
        remainingQuota: 280,
        status: "active" as const
      }
    ]
  },
  {
    surveyCode: "IM_FIN_SERVICES_DRAFT",
    providerCompanyCode: "KANTAR_PRO",
    surveyName: "Financial services — draft (not on public hub)",
    externalSurveyId: "KNT-FIN-0099",
    surveyStatus: "draft" as const,
    externalSurveyUrl:
      "https://example.com/finance/draft-placeholder?pid=IM_FIN_DRAFT_0099",
    trackingParameterName: "token",
    participantQueryParam: "pid",
    targetCountries: ["UK"],
    targetGender: "all" as const,
    targetAgeMin: null,
    targetAgeMax: null,
    targetProfessions: [],
    targetIndustries: ["banking"],
    targetCompanySizes: [],
    targetDevices: ["desktop", "mobile"],
    targetLanguages: ["en"],
    incidenceRate: null,
    estimatedLOI: 15,
    payoutToUser: null,
    revenuePerComplete: null,
    totalQuota: 0,
    remainingQuota: 0,
    surveyPriority: 0,
    notes: "Seed: intentionally draft — should NOT appear on public landing.",
    dynamicQuotaGroups: []
  }
];

async function main() {
  await connectDatabase();

  let inserted = 0;
  let updated = 0;

  for (const row of SEED_SURVEYS) {
    const provider = await SurveyCompany.findOne({ companyCode: row.providerCompanyCode });
    if (!provider) {
      console.warn(`Skipping ${row.surveyCode}: provider ${row.providerCompanyCode} not found. Run seed:survey-providers first.`);
      continue;
    }

    const { providerCompanyCode: _p, dynamicQuotaGroups, ...rest } = row;

    const payload = {
      ...rest,
      providerId: provider._id,
      supplierProjectPid:
        extractSupplierProjectPidFromUrl(String(rest.externalSurveyUrl)) ?? "",
      dynamicQuotaGroups: dynamicQuotaGroups.map((g) => ({
        groupName: g.groupName,
        groupDescription: g.groupDescription,
        totalQuota: g.totalQuota,
        remainingQuota: g.remainingQuota,
        status: g.status
      }))
    };

    const existing = await PanelSurvey.findOne({ surveyCode: row.surveyCode });
    await PanelSurvey.findOneAndUpdate(
      { surveyCode: row.surveyCode },
      { $set: payload },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    if (existing) updated += 1;
    else inserted += 1;
  }

  console.info(
    `Panel surveys seed complete: ${inserted} inserted, ${updated} updated (${SEED_SURVEYS.length} definitions).`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
