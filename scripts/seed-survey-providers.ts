import "dotenv/config";
import { connectDatabase } from "../src/database/mongo";
import { SurveyCompany } from "../src/models/SurveyCompany";
import type { SurveyProviderType } from "../src/constants/survey-company";

type SeedRow = {
  companyName: string;
  companyCode: string;
  contactPersonName: string;
  companyEmail: string;
  companyPhone: string;
  websiteUrl: string;
  providerType: SurveyProviderType;
  status: "active" | "inactive";
  notes: string;
};

/** Realistic panel / sample-supply partners for dev & QA (public brand names only). */
const SURVEY_PROVIDERS: SeedRow[] = [
  {
    companyName: "Dynata",
    companyCode: "DYNATA",
    contactPersonName: "Sarah Mitchell",
    companyEmail: "supplier.integrations@dynata.com",
    companyPhone: "+1 (203) 567-8901",
    websiteUrl: "https://www.dynata.com",
    providerType: "sample_exchange",
    status: "active",
    notes:
      "Major global sample exchange. Typical integration: API key + study IDs; reconcile completes nightly in vendor dashboard."
  },
  {
    companyName: "Lucid (Cint)",
    companyCode: "LUCID",
    contactPersonName: "James Okonkwo",
    companyEmail: "marketplace.support@cint.com",
    companyPhone: "+44 20 7946 0955",
    websiteUrl: "https://www.cint.com",
    providerType: "sample_exchange",
    status: "active",
    notes:
      "Lucid marketplace flows through Cint. Use supplier ID from contracts desk; currency and CPI caps in IO."
  },
  {
    companyName: "Cint",
    companyCode: "CINT",
    contactPersonName: "Elena Vasquez",
    companyEmail: "accounts.pm@cint.com",
    companyPhone: "+46 8 525 109 00",
    websiteUrl: "https://www.cint.com",
    providerType: "panel_network",
    status: "active",
    notes:
      "Access Hub / buyer portal for marketplace buys. Coordinate overlap rules when running same study on multiple exchanges."
  },
  {
    companyName: "PureSpectrum",
    companyCode: "PURESPEC",
    contactPersonName: "Michael Chen",
    companyEmail: "integrations@purespectrum.com",
    companyPhone: "+1 (415) 555-0142",
    websiteUrl: "https://purespectrum.com",
    providerType: "sample_exchange",
    status: "active",
    notes:
      "Router-style distribution with quality tiers. Document fraud thresholds and duplicate PID rules with AM."
  },
  {
    companyName: "Toluna",
    companyCode: "TOLUNA",
    contactPersonName: "Amélie Durand",
    companyEmail: "client.success@toluna.com",
    companyPhone: "+33 1 53 77 55 20",
    websiteUrl: "https://www.toluna.com",
    providerType: "panel_network",
    status: "active",
    notes:
      "Multi-country panels; quota alignment calls weekly during field. Survey IDs issued via Toluna Start portal."
  },
  {
    companyName: "Ipsos Digital",
    companyCode: "IPSOS_DIG",
    contactPersonName: "David Brennan",
    companyEmail: "digitalsampling.emea@ipsos.com",
    companyPhone: "+353 1 664 0000",
    websiteUrl: "https://www.ipsos.com",
    providerType: "full_service",
    status: "active",
    notes:
      "Full-service field for trackers and ad hoc. Statement of work required; sample specs locked before launch."
  },
  {
    companyName: "Kantar Profiles",
    companyCode: "KANTAR_PRO",
    contactPersonName: "Helena Müller",
    companyEmail: "profiles.operations@kantar.com",
    companyPhone: "+49 69 97169 0",
    websiteUrl: "https://www.kantar.com",
    providerType: "full_service",
    status: "active",
    notes:
      "Enterprise sampling; long lead times on niche cuts. Reference IO number on all traffic requests."
  },
  {
    companyName: "SurveyConnect",
    companyCode: "SVYCONN",
    contactPersonName: "Priya Natarajan",
    companyEmail: "support@surveyconnect.io",
    companyPhone: "+1 (647) 555-0198",
    websiteUrl: "https://www.surveyconnect.io",
    providerType: "router",
    status: "active",
    notes:
      "Third-party router integration (example vendor). Callback URLs and encryption keys stored in secrets vault."
  },
  {
    companyName: "Spectrum Router Labs",
    companyCode: "SPEC_ROUTER",
    contactPersonName: "Alex Rivera",
    companyEmail: "api-support@spectrumrouter.example.com",
    companyPhone: "+1 (512) 555-0167",
    websiteUrl: "https://spectrumrouter.example.com",
    providerType: "api_partner",
    status: "inactive",
    notes:
      "Pilot integration paused Q2 — re-enable after compliance review. Test traffic only; do not route production CPI."
  },
  {
    companyName: "OpinionRoute Exchange",
    companyCode: "OPINION_RT",
    contactPersonName: "Chris Taylor",
    companyEmail: "traffic@opinionroute.example.net",
    companyPhone: "+44 161 555 0183",
    websiteUrl: "https://opinionroute.example.net",
    providerType: "sample_exchange",
    status: "active",
    notes:
      "Secondary liquidity for UK/US consumer. Match census quotas closely — soft launch recommended."
  }
];

async function main() {
  await connectDatabase();

  let created = 0;
  let updated = 0;

  for (const row of SURVEY_PROVIDERS) {
    const existing = await SurveyCompany.findOne({ companyCode: row.companyCode });
    await SurveyCompany.findOneAndUpdate(
      { companyCode: row.companyCode },
      { $set: row },
      { upsert: true, new: true, runValidators: true }
    );
    if (existing) updated += 1;
    else created += 1;
  }

  console.info(
    `Survey providers seed complete: ${created} inserted, ${updated} updated (${SURVEY_PROVIDERS.length} total).`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
