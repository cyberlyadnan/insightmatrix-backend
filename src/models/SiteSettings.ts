import mongoose from "mongoose";

const siteSettingsSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      required: true,
      unique: true,
      default: "default_site_settings",
      index: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: "InsightMatrix Research",
    },
    tagline: {
      type: String,
      trim: true,
      default: "Better Insights. Smarter Decisions.",
    },
    statement: {
      type: String,
      trim: true,
      default:
        "InsightMatrix Research is a global market research and data collection company delivering reliable, high-quality insights to businesses, agencies, consultancies, and organizations worldwide.",
    },
    shortDescription: {
      type: String,
      trim: true,
      default:
        "InsightMatrix Research specializes in end-to-end market research and global data collection solutions across international markets.",
    },
    longDescription: [{ type: String, trim: true }],
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "info@insightmatrix.online",
    },
    salesEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "sales@insightmatrix.online",
    },
    supportEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "help@insightmatrix.online",
    },
    phones: [{ type: String, trim: true }],
    businessHours: {
      type: String,
      trim: true,
      default: "Monday – Saturday, 9:00 AM – 7:00 PM",
    },
    address: {
      street: { type: String, trim: true, default: "123 Data Point Avenue, Suite 800" },
      city: { type: String, trim: true, default: "San Francisco" },
      state: { type: String, trim: true, default: "CA" },
      country: { type: String, trim: true, default: "USA" },
      postalCode: { type: String, trim: true, default: "94105" },
      hqLabel: { type: String, trim: true, default: "Silicon Valley HQ" },
    },
    socialLinks: {
      linkedin: {
        type: String,
        trim: true,
        default: "https://www.linkedin.com/company/insightmatrixresearch",
      },
      instagram: {
        type: String,
        trim: true,
        default:
          "https://www.instagram.com/insightmatrix_research?igsh=OHp5dXdxbzdmcG13&utm_source=qr",
      },
      twitter: { type: String, trim: true, default: "" },
      facebook: { type: String, trim: true, default: "" },
      youtube: { type: String, trim: true, default: "" },
      website: { type: String, trim: true, default: "https://www.insightmatrix.online" },
    },
    seoDefaultTitle: {
      type: String,
      trim: true,
      default:
        "Global Market Research & Data Collection Company | InsightMatrix Research",
    },
    seoDefaultDescription: {
      type: String,
      trim: true,
      default:
        "InsightMatrix Research is a global market research and data collection company providing B2B, B2C, Healthcare, Qualitative, Quantitative, Online Panel, CATI, Survey Programming, and Data Processing solutions worldwide.",
    },
    seoKeywords: [{ type: String, trim: true }],
    copyrightText: {
      type: String,
      trim: true,
      default: "InsightMatrix Research. All rights reserved.",
    },
  },
  { timestamps: true }
);

export const SiteSettings = mongoose.model("SiteSettings", siteSettingsSchema);
