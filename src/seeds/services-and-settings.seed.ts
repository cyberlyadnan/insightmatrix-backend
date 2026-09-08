import { Service } from "../models/Service";
import { SiteSettings } from "../models/SiteSettings";
import { SERVICES_CATALOG } from "./services-catalog-data";

const INDUSTRY_SLUGS = new Set([
  "healthcare",
  "pharmaceutical-biotechnology",
  "technology-saas",
  "banking-financial-services-fintech",
  "retail-ecommerce",
]);

const iconMap: Record<string, string> = {
  "online-data-collection": "Database",
  "b2b-market-research": "Building2",
  "b2c-market-research": "Users",
  "healthcare-market-research": "Stethoscope",
  "qualitative-market-research": "MessageSquareQuote",
  "survey-programming": "Code2",
  "cati-services": "PhoneCall",
  "data-processing": "Layers",
  "online-panel-solutions": "Users",
  "respondent-recruitment": "Users",
  "quantitative-market-research": "BarChart3",
  "translation-localization": "Globe",
  "brand-tracking": "Zap",
  "product-testing": "Layers",
  "concept-testing": "Zap",
  "pricing-research": "BarChart3",
  "market-segmentation": "Layers",
  "usage-attitude-research": "Users",
  "employee-engagement-research": "HeartPulse",
  "public-opinion-research": "Globe",
  "omnibus-research": "Database",
  healthcare: "Stethoscope",
  "pharmaceutical-biotechnology": "HeartPulse",
  "technology-saas": "Laptop",
  "banking-financial-services-fintech": "Landmark",
  "retail-ecommerce": "ShoppingBag",
};

export async function executeServicesAndSettingsSeed() {
  let servicesInserted = 0;
  let servicesUpdated = 0;

  for (let i = 0; i < SERVICES_CATALOG.length; i++) {
    const raw = SERVICES_CATALOG[i];
    const slug = raw.slug.trim().toLowerCase();
    const isIndustry = INDUSTRY_SLUGS.has(slug);
    const category = isIndustry ? "industries" : "core";
    const icon = iconMap[slug] || "Layers";
    const order = i + 1;

    const payload = {
      slug,
      service_name: raw.service_name,
      category,
      status: "published",
      order,
      icon,
      featured: i < 9,
      seo: raw.seo || {},
      hero: raw.hero || {},
      introduction: raw.introduction || {},
      what_we_offer: raw.what_we_offer || {},
      target_audiences: raw.target_audiences || {},
      research_types: raw.research_types || {},
      quality_assurance: raw.quality_assurance || {},
      global_coverage: raw.global_coverage || {},
      why_insightmatrix: raw.why_insightmatrix || {},
      process: raw.process || {},
      why_clients_trust_us: raw.why_clients_trust_us || {},
      faqs: raw.faqs || {},
      final_cta: raw.final_cta || {},
      internal_links: raw.internal_links || [],
    };

    const existing = await Service.findOne({ slug });
    if (existing) {
      await Service.updateOne({ slug }, { $set: payload });
      servicesUpdated++;
    } else {
      await Service.create(payload);
      servicesInserted++;
    }
  }

  // Seed default site settings singleton if not present
  const existingSettings = await SiteSettings.findOne({
    singletonKey: "default_site_settings",
  });

  let settingsStatus = "already_exists";
  if (!existingSettings) {
    await SiteSettings.create({
      singletonKey: "default_site_settings",
      companyName: "InsightMatrix Research",
      tagline: "Better Insights. Smarter Decisions.",
      statement:
        "InsightMatrix Research is a global market research and data collection company delivering reliable, high-quality insights to businesses, agencies, consultancies, and organizations worldwide.",
      shortDescription:
        "InsightMatrix Research specializes in end-to-end market research and global data collection solutions across international markets.",
      longDescription: [
        "InsightMatrix Research is a trusted global market research and data collection partner committed to helping organizations understand markets, customers, and industries through high-quality research solutions.",
        "We work with research agencies, consulting firms, healthcare organizations, technology companies, brands, and public sector institutions to deliver reliable insights that support strategic decision-making.",
        "Our expertise spans quantitative research, qualitative research, online panel management, survey programming, CATI, healthcare studies, B2B research, consumer research, and advanced data processing.",
      ],
      email: "info@insightmatrix.online",
      salesEmail: "sales@insightmatrix.online",
      supportEmail: "help@insightmatrix.online",
      phones: ["+91 8707017533", "+91 8299357161"],
      businessHours: "Monday – Saturday, 9:00 AM – 7:00 PM",
      address: {
        street: "123 Data Point Avenue, Suite 800",
        city: "San Francisco",
        state: "CA",
        country: "USA",
        postalCode: "94105",
        hqLabel: "Silicon Valley HQ",
      },
      socialLinks: {
        linkedin: "https://www.linkedin.com/company/insightmatrixresearch",
        instagram:
          "https://www.instagram.com/insightmatrix_research?igsh=OHp5dXdxbzdmcG13&utm_source=qr",
        twitter: "",
        facebook: "",
        youtube: "",
        website: "https://www.insightmatrix.online",
      },
      seoDefaultTitle:
        "Global Market Research & Data Collection Company | InsightMatrix Research",
      seoDefaultDescription:
        "InsightMatrix Research is a global market research and data collection company providing B2B, B2C, Healthcare, Qualitative, Quantitative, Online Panel, CATI, Survey Programming, and Data Processing solutions worldwide.",
      seoKeywords: [
        "Market Research",
        "Online Data Collection",
        "Global Research",
        "Healthcare Research",
        "B2B Research",
        "B2C Research",
        "Survey Programming",
        "CATI",
        "Qualitative Research",
        "Data Processing",
        "Online Panels",
      ],
      copyrightText: "InsightMatrix Research. All rights reserved.",
    });
    settingsStatus = "created";
  }

  return {
    servicesInserted,
    servicesUpdated,
    totalServices: SERVICES_CATALOG.length,
    settingsStatus,
  };
}
