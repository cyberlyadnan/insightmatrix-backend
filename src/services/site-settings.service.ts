import { SiteSettings } from "../models/SiteSettings";

const DEFAULT_SINGLETON_KEY = "default_site_settings";

const INITIAL_DEFAULT_SETTINGS = {
  singletonKey: DEFAULT_SINGLETON_KEY,
  companyName: "InsightMatrix Research",
  tagline: "Better Insights. Smarter Decisions.",
  statement:
    "InsightMatrix Research is a global market research and data collection company delivering reliable, high-quality insights to businesses, agencies, consultancies, and organizations worldwide. We combine advanced research methodologies, experienced project management, and rigorous quality standards to help clients make informed business decisions with confidence.",
  shortDescription:
    "InsightMatrix Research specializes in end-to-end market research and global data collection solutions. We provide quantitative and qualitative research, B2B and B2C studies, healthcare research, online panel solutions, survey programming, and data processing services across international markets.",
  longDescription: [
    "InsightMatrix Research is a trusted global market research and data collection partner committed to helping organizations understand markets, customers, and industries through high-quality research solutions.",
    "We work with research agencies, consulting firms, healthcare organizations, technology companies, brands, and public sector institutions to deliver reliable insights that support strategic decision-making.",
    "Our expertise spans quantitative research, qualitative research, online panel management, survey programming, CATI, healthcare studies, B2B research, consumer research, and advanced data processing.",
    "With a strong focus on quality assurance, transparency, and operational excellence, InsightMatrix Research combines experienced project management with modern research technologies to deliver accurate, timely, and actionable data.",
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
};

export const siteSettingsService = {
  getSettings: async () => {
    let settings = await SiteSettings.findOne({ singletonKey: DEFAULT_SINGLETON_KEY }).lean();
    if (!settings) {
      settings = (await SiteSettings.create(INITIAL_DEFAULT_SETTINGS)).toObject();
    }
    return settings;
  },

  updateSettings: async (payload: Record<string, unknown>) => {
    const updated = await SiteSettings.findOneAndUpdate(
      { singletonKey: DEFAULT_SINGLETON_KEY },
      { $set: payload },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    return updated;
  },
};
