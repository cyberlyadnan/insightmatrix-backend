export interface SurveySherpaLanguage {
  id: number;
  country_name?: string;
  country_code?: string;
  language_name?: string;
  language_code?: string;
  language?: string;
  name?: string;
}

export interface SurveySherpaOption {
  option_id: number | string;
  option_text: string;
  option_value?: string;
}

export interface SurveySherpaQuestion {
  question_id: number | string;
  question_text: string;
  question_type: string; // e.g. "Single Punch" | "Multi Punch" | "range" | "Open Ended" | "Numeric Open Ended"
  options: SurveySherpaOption[];
}

export interface SurveySherpaQualificationGroup {
  qualification_id: number;
  qualification_name: string;
  questions: SurveySherpaQuestion[];
}

export interface SurveySherpaSurveySummary {
  survey_id: number;
  survey_name: string;
  description?: string;
  lang_id: number;
  complete_required: number;
  loi: number;
  ir: number;
  cpi: number;
  url: string;
  created_at?: string;
  modifiedDate?: string;
}

export interface SurveySherpaSurveyQualification {
  questionKey: string;
  questionText: string;
  questionType: string;
  options: string[];
}

export interface SurveySherpaSurveyDetails extends SurveySherpaSurveySummary {
  qualifications: SurveySherpaSurveyQualification[];
}

export interface SurveySherpaSurveyStats {
  survey_id: number;
  total_entrance: number;
  total_completes: number;
}

export interface SurveySherpaApiResponse<T = unknown> {
  success: boolean;
  apiVersion?: number;
  message?: string;
  result?: {
    success?: boolean;
    message?: string;
    data?: T;
  };
  data?: T;
}
