/**
 * Export all panel surveys (with provider company) and their links to JSON.
 *
 * Usage: npm run export:survey-links
 * Output: exports/survey-links-<timestamp>.json
 */
import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";

import { env } from "../src/config/env";
import { PanelSurvey } from "../src/models/PanelSurvey";
import "../src/models/SurveyCompany";
import {
  buildPanelSurveyShareLink,
  buildPanelSurveyShareLinkExample
} from "../src/utils/panel-survey-routing-link";

dotenv.config();

type PopulatedProvider = {
  _id?: unknown;
  companyName?: string;
  companyCode?: string;
  providerType?: string;
  status?: string;
  websiteUrl?: string;
};

function iso(d: unknown): string | null {
  if (!d) return null;
  const t = d instanceof Date ? d : new Date(String(d));
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

async function main() {
  if (!env.MONGO_URI?.trim()) {
    throw new Error("MONGO_URI is not set in .env");
  }

  await mongoose.connect(env.MONGO_URI);

  const surveys = await PanelSurvey.find()
    .populate("providerId", "companyName companyCode providerType status websiteUrl")
    .sort({ createdAt: -1 })
    .lean();

  const items = surveys.map((doc) => {
    const id = String(doc._id);
    const provider = doc.providerId as PopulatedProvider | null;
    const participantQueryParam = String(doc.participantQueryParam ?? "toid").trim() || "toid";

    return {
      id,
      surveyName: doc.surveyName ?? "",
      surveyCode: doc.surveyCode ?? "",
      surveyStatus: doc.surveyStatus ?? "",
      externalSurveyId: doc.externalSurveyId ?? "",
      provider: provider
        ? {
            id: String(provider._id ?? ""),
            companyName: provider.companyName ?? "",
            companyCode: provider.companyCode ?? "",
            providerType: provider.providerType ?? "",
            status: provider.status ?? "",
            websiteUrl: provider.websiteUrl ?? ""
          }
        : null,
      links: {
        /** Supplier entry URL (from provider portal) */
        externalSurveyUrl: doc.externalSurveyUrl ?? "",
        /** Callback / project id (admin-entered) */
        supplierProjectPid: doc.supplierProjectPid ?? "",
        /** Query key we append IMX token on supplier redirect */
        trackingParameterName: doc.trackingParameterName ?? "toid",
        /** Internal team share link parameter */
        participantQueryParam,
        /** Public InsightMatrix landing (no respondent id) */
        panelShareLink: buildPanelSurveyShareLink(id),
        /** Copy template — replace RESPONDENT_ID */
        panelShareLinkExample: buildPanelSurveyShareLinkExample(id, participantQueryParam)
      },
      quotas: {
        totalQuota: doc.totalQuota ?? 0,
        remainingQuota: doc.remainingQuota ?? 0,
        dynamicQuotaGroups: (doc.dynamicQuotaGroups ?? []).map((g) => ({
          groupName: g.groupName,
          totalQuota: g.totalQuota,
          remainingQuota: g.remainingQuota,
          status: g.status
        }))
      },
      createdAt: iso(doc.createdAt),
      updatedAt: iso(doc.updatedAt)
    };
  });

  const byProvider = new Map<string, number>();
  for (const row of items) {
    const key = row.provider?.companyCode ?? "UNKNOWN";
    byProvider.set(key, (byProvider.get(key) ?? 0) + 1);
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    clientBaseUrl: env.CLIENT_URL.replace(/\/$/, ""),
    summary: {
      totalSurveys: items.length,
      byProviderCode: Object.fromEntries(byProvider.entries())
    },
    surveys: items
  };

  const outDir = path.join(process.cwd(), "exports");
  await fs.mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(outDir, `survey-links-${stamp}.json`);
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), "utf8");

  const latestPath = path.join(outDir, "survey-links-latest.json");
  await fs.writeFile(latestPath, JSON.stringify(payload, null, 2), "utf8");

  console.log(`Exported ${items.length} survey(s) to:\n  ${outPath}\n  ${latestPath}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
