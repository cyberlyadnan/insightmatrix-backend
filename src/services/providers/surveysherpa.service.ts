import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type {
  SurveySherpaApiResponse,
  SurveySherpaLanguage,
  SurveySherpaQualificationGroup,
  SurveySherpaSurveyDetails,
  SurveySherpaSurveyStats,
  SurveySherpaSurveySummary
} from "../../types/surveysherpa.types";

export class SurveySherpaService {
  private accessKey: string;
  private baseUrl: string;

  constructor(accessKey?: string, baseUrl?: string) {
    this.baseUrl = (baseUrl || env.SURVEYSHERPA_API_BASE_URL || "https://api.surveysherpa.com").replace(/\/$/, "");
    this.accessKey = accessKey || env.SURVEYSHERPA_ACCESS_KEY || "";
  }

  public setCredentials(accessKey: string, baseUrl?: string): void {
    this.accessKey = accessKey;
    if (baseUrl) this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  public getAccessKey(): string {
    return this.accessKey;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(path: string, options: { method?: string; query?: Record<string, string | number> } = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (options.query) {
      for (const [key, val] of Object.entries(options.query)) {
        if (val !== undefined && val !== null) {
          url.searchParams.set(key, String(val));
        }
      }
    }

    const res = await fetch(url.toString(), {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "access-key": this.accessKey
      }
    });

    if (!res.ok && res.status >= 500) {
      throw new Error(`SurveySherpa HTTP ${res.status}: ${res.statusText}`);
    }

    const json = (await res.json()) as SurveySherpaApiResponse<T>;
    return this.extractData<T>(json);
  }

  private extractData<T>(resData: SurveySherpaApiResponse<T>): T {
    if (resData.result) {
      if (resData.result.success === false) {
        throw new Error(resData.result.message || "SurveySherpa API returned an error");
      }
      if (resData.result.data !== undefined) {
        return resData.result.data;
      }
    }
    if (resData.data !== undefined) {
      return resData.data;
    }
    return resData as unknown as T;
  }

  public async testConnection(): Promise<{
    connected: boolean;
    validKey: boolean;
    message: string;
    languageCount: number;
    languages: SurveySherpaLanguage[];
  }> {
    try {
      const languages = await this.getDefinitions();
      let validKey = true;
      let surveyCheckMsg = "Connected to SurveySherpa Suppliers API";
      try {
        await this.getAllSurveys();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes("invalid access key")) {
          validKey = false;
          surveyCheckMsg = "Connected to public definitions, but access key is invalid for live surveys";
        }
      }

      return {
        connected: true,
        validKey,
        message: surveyCheckMsg,
        languageCount: languages.length,
        languages
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`SurveySherpa testConnection failed: ${msg}`);
      return {
        connected: false,
        validKey: false,
        message: msg,
        languageCount: 0,
        languages: []
      };
    }
  }

  public async getDefinitions(): Promise<SurveySherpaLanguage[]> {
    try {
      const data = await this.request<{ languages: SurveySherpaLanguage[] }>("/api/supplier/getDefinitions");
      if (data && Array.isArray((data as { languages?: SurveySherpaLanguage[] }).languages)) {
        return (data as { languages: SurveySherpaLanguage[] }).languages;
      }
      if (Array.isArray(data)) {
        return data as unknown as SurveySherpaLanguage[];
      }
      return [];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch definitions";
      logger.error(`SurveySherpa getDefinitions error: ${message}`);
      throw new Error(`SurveySherpa Definitions Error: ${message}`);
    }
  }

  public async getQualifications(langId: number): Promise<SurveySherpaQualificationGroup[]> {
    try {
      const data = await this.request<SurveySherpaQualificationGroup[]>("/api/supplier/getQualifications", {
        query: { lang_id: langId }
      });
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch qualifications";
      logger.error(`SurveySherpa getQualifications error (lang_id=${langId}): ${message}`);
      throw new Error(`SurveySherpa Qualifications Error: ${message}`);
    }
  }

  public async getAllSurveys(): Promise<SurveySherpaSurveySummary[]> {
    try {
      const data = await this.request<SurveySherpaSurveySummary[]>("/api/supplier/getAllSurveys");
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch surveys";
      logger.error(`SurveySherpa getAllSurveys error: ${message}`);
      throw new Error(`SurveySherpa Surveys Error: ${message}`);
    }
  }

  public async getSurveyDetails(surveyId: number): Promise<SurveySherpaSurveyDetails | null> {
    try {
      const data = await this.request<SurveySherpaSurveyDetails[]>("/api/supplier/getSurveyDetails", {
        query: { survey_id: surveyId }
      });
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
      if (data && (data as unknown as SurveySherpaSurveyDetails).survey_id) {
        return data as unknown as SurveySherpaSurveyDetails;
      }
      return null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch survey details";
      logger.error(`SurveySherpa getSurveyDetails error (survey_id=${surveyId}): ${message}`);
      throw new Error(`SurveySherpa Survey Details Error: ${message}`);
    }
  }

  public async getSurveyStats(surveyId: number): Promise<SurveySherpaSurveyStats | null> {
    try {
      const data = await this.request<SurveySherpaSurveyStats>("/api/supplier/getSurveyStats", {
        query: { survey_id: surveyId }
      });
      if (data && typeof data === "object" && "survey_id" in data) {
        return data;
      }
      return null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch survey stats";
      logger.error(`SurveySherpa getSurveyStats error (survey_id=${surveyId}): ${message}`);
      throw new Error(`SurveySherpa Survey Stats Error: ${message}`);
    }
  }
}

export const surveySherpaService = new SurveySherpaService();
