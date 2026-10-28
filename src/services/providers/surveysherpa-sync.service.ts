import { Types } from "mongoose";
import { SurveyCompany } from "../../models/SurveyCompany";
import { PanelSurvey } from "../../models/PanelSurvey";
import { logger } from "../../config/logger";
import { surveySherpaService } from "./surveysherpa.service";
import type {
  SurveySherpaSurveyDetails,
  SurveySherpaSurveySummary
} from "../../types/surveysherpa.types";
import { generatePublicSurveyName } from "../../utils/panel-survey-name";

export interface SyncSurveysOptions {
  autoActivate?: boolean;
  defaultStatus?: "draft" | "active" | "paused";
  syncQualifications?: boolean;
}

export interface SyncSurveysResult {
  totalRemote: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

export interface RemoteSurveyWithStatus extends SurveySherpaSurveySummary {
  isImported: boolean;
  localSurveyId?: string;
  localStatus?: string;
  localRemainingQuota?: number;
}

export class SurveySherpaSyncService {
  /**
   * Ensure SurveySherpa exists in SurveyCompany collection
   */
  public async ensureSurveySherpaCompany(): Promise<Types.ObjectId> {
    const company = await SurveyCompany.findOneAndUpdate(
      { companyCode: "SURVEYSHERPA" },
      {
        $setOnInsert: {
          companyCode: "SURVEYSHERPA",
          companyName: "SurveySherpa",
          providerType: "api_partner",
          status: "active",
          websiteUrl: "https://surveysherpa.com",
          contactPersonName: "SurveySherpa Partner Desk",
          companyEmail: "support@surveysherpa.com",
          notes: "Automated integration via SurveySherpa Suppliers API"
        }
      },
      { upsert: true, new: true }
    );
    return company._id;
  }

  /**
   * Fetch all remote surveys from SurveySherpa and augment with local import status
   */
  public async getRemoteSurveysWithLocalStatus(): Promise<{
    surveys: RemoteSurveyWithStatus[];
    languages: { id: number; name: string }[];
  }> {
    const [remoteSurveys, languages, providerId] = await Promise.all([
      surveySherpaService.getAllSurveys(),
      surveySherpaService.getDefinitions().catch(() => []),
      this.ensureSurveySherpaCompany()
    ]);

    // Find all panel surveys already imported for SurveySherpa
    const existing = await PanelSurvey.find({
      providerId,
      externalSurveyId: { $in: remoteSurveys.map((s) => String(s.survey_id)) }
    })
      .select("_id externalSurveyId surveyStatus remainingQuota")
      .lean();

    const existingMap = new Map<string, { id: string; status: string; remainingQuota: number }>();
    for (const doc of existing) {
      if (doc.externalSurveyId) {
        existingMap.set(doc.externalSurveyId, {
          id: String(doc._id),
          status: doc.surveyStatus,
          remainingQuota: doc.remainingQuota
        });
      }
    }

    const langNameMap = new Map<number, string>();
    for (const l of languages) {
      langNameMap.set(l.id, l.language || l.language_name || l.name || `Lang ${l.id}`);
    }

    const surveys: RemoteSurveyWithStatus[] = (remoteSurveys || []).map((s) => {
      const sAny = s as unknown as Record<string, unknown>;
      const survey_id = Number(s?.survey_id ?? sAny?.id) || 0;
      const survey_name = String(
        s?.survey_name ?? sAny?.name ?? sAny?.surveyName ?? `Survey #${survey_id}`
      );
      const match = existingMap.get(String(survey_id));
      return {
        ...s,
        survey_id,
        survey_name,
        cpi: Number(s?.cpi) || 0,
        loi: Number(s?.loi) || 0,
        ir: Number(s?.ir) || 0,
        complete_required: Number(s?.complete_required) || 0,
        isImported: !!match,
        localSurveyId: match?.id,
        localStatus: match?.status,
        localRemainingQuota: match?.remainingQuota
      };
    });

    return {
      surveys,
      languages: languages.map((l) => ({
        id: l.id,
        name: l.language || l.language_name || l.name || `Lang ${l.id}`
      }))
    };
  }

  /**
   * Import a single survey by ID from SurveySherpa
   */
  public async importSurveyById(
    surveyId: number,
    options: SyncSurveysOptions = {}
  ): Promise<{ survey: unknown; isNew: boolean }> {
    const providerId = await this.ensureSurveySherpaCompany();
    const remoteSurvey = await surveySherpaService.getSurveyDetails(surveyId);

    if (!remoteSurvey) {
      throw new Error(`SurveySherpa survey with ID ${surveyId} was not found on remote server`);
    }

    return this.upsertPanelSurvey(remoteSurvey, providerId, options);
  }

  /**
   * Sync all surveys from SurveySherpa
   */
  public async syncAllSurveys(options: SyncSurveysOptions = {}): Promise<SyncSurveysResult> {
    const providerId = await this.ensureSurveySherpaCompany();
    const remoteSurveys = await surveySherpaService.getAllSurveys();

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of remoteSurveys) {
      try {
        let details: SurveySherpaSurveyDetails | null = null;
        if (options.syncQualifications) {
          try {
            details = await surveySherpaService.getSurveyDetails(item.survey_id);
          } catch (e) {
            logger.warn(
              `Could not fetch details for survey ${item.survey_id}: ${
                e instanceof Error ? e.message : String(e)
              }`
            );
          }
        }

        const surveyToSave = details || {
          ...item,
          qualifications: []
        };

        const res = await this.upsertPanelSurvey(surveyToSave, providerId, options);
        if (res.isNew) created++;
        else updated++;
      } catch (err: unknown) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Survey ${item.survey_id}: ${msg}`);
        logger.error(`Error syncing survey ${item.survey_id}: ${msg}`);
      }
    }

    return {
      totalRemote: remoteSurveys.length,
      created,
      updated,
      failed,
      errors
    };
  }

  /**
   * Upsert SurveySherpa record into PanelSurvey
   */
  private async upsertPanelSurvey(
    remote: SurveySherpaSurveySummary & { qualifications?: unknown[] },
    providerId: Types.ObjectId,
    options: SyncSurveysOptions
  ): Promise<{ survey: unknown; isNew: boolean }> {
    const externalSurveyId = String(remote.survey_id);
    const surveyCode = `SS-${remote.survey_id}`.toUpperCase();
    const targetStatus = options.defaultStatus || (options.autoActivate ? "active" : "draft");

    const existing = await PanelSurvey.findOne({
      $or: [{ externalSurveyId, providerId }, { surveyCode }]
    });

    const loi = Number(remote.loi) || 10;
    const ir = Number(remote.ir) || 50;
    const cpi = Number(remote.cpi) || 1.0;
    const quota = Number(remote.complete_required) || 100;
    const rawUrl = String(remote.url || "").trim();

    // Map language id to a country/language code if available
    const targetLanguages: string[] = [];
    if (remote.lang_id === 1) targetLanguages.push("en-US");
    else targetLanguages.push(`lang_${remote.lang_id}`);

    const updateDoc: Record<string, unknown> = {
      surveyName: remote.survey_name?.trim() || `SurveySherpa Study ${remote.survey_id}`,
      publicSurveyName:
        remote.survey_name?.trim() || generatePublicSurveyName(surveyCode, externalSurveyId),
      surveyCode,
      externalSurveyId,
      providerId,
      surveyAudience: "public",
      externalSurveyUrl: rawUrl,
      supplierProjectPid: externalSurveyId,
      trackingParameterName: "toid",
      participantQueryParam: "toid",
      incidenceRate: Math.min(100, Math.max(0, ir)),
      estimatedLOI: loi,
      revenuePerComplete: cpi,
      companyBillingAmount: cpi,
      totalQuota: quota,
      targetLanguages,
      notes: remote.description ? `SurveySherpa: ${remote.description}` : "Imported from SurveySherpa"
    };

    if (!existing) {
      updateDoc.surveyStatus = targetStatus;
      updateDoc.remainingQuota = quota;

      const createdDoc = await PanelSurvey.create(updateDoc);
      return { survey: createdDoc, isNew: true };
    }

    // Preserve existing remainingQuota if active, or update if new quota is higher
    if (existing.remainingQuota === undefined || existing.remainingQuota === null) {
      updateDoc.remainingQuota = quota;
    }

    const updatedDoc = await PanelSurvey.findByIdAndUpdate(
      existing._id,
      { $set: updateDoc },
      { new: true }
    );

    return { survey: updatedDoc, isNew: false };
  }

  /**
   * Sync real-time stats for a survey
   */
  public async syncSurveyStats(surveyId: number): Promise<{
    stats: unknown;
    updated: boolean;
  }> {
    const stats = await surveySherpaService.getSurveyStats(surveyId);
    if (!stats) {
      return { stats: null, updated: false };
    }

    const survey = await PanelSurvey.findOne({
      externalSurveyId: String(surveyId)
    });

    if (survey) {
      const remaining = Math.max(0, survey.totalQuota - stats.total_completes);
      survey.remainingQuota = remaining;
      if (remaining <= 0 && survey.surveyStatus === "active") {
        survey.surveyStatus = "completed";
      }
      await survey.save();
      return { stats, updated: true };
    }

    return { stats, updated: false };
  }
}

export const surveySherpaSyncService = new SurveySherpaSyncService();
