export type Lang = "en" | "fil" | "ceb";

export interface KbEntry {
  id: string;
  name_en: string;
  name_ceb: string;
  locality: string;
  who_may_avail: string;
  scope_note: string;
  requirements: string[];
  requirements_note: string;
  steps: string[];
  fee: string;
  office: string;
  processing_time: string;
  source_title: string;
  source_url: string;
  last_verified: string;
  notes: string;
  // Curated, hand-reviewed Cebuano shown to users. The model never writes these.
  summary_ceb: string;
  requirements_ceb: string[];
  requirements_note_ceb: string;
  steps_ceb: string[];
  office_ceb: string;
  fee_ceb: string;
  processing_time_ceb: string;
  // Optional, additive fields for AyaSib — Andam Na (Feature: ayasib-andam-na).
  // Existing entries omit these and stay valid unchanged.
  next_step?: string;
  next_step_ceb?: string;
  related?: string[];
  review_status?: "verified" | "needs_review" | "unconfirmed";
  review_due?: string;
}

// FUTURE (durable server-side reporting is deferred; unused in the MVP).
export interface ReportRequest {
  id: string;
  message: string;
}
export interface ReportResponse {
  received: true;
  message: string;
}

export interface Source {
  title: string;
  url: string;
  last_verified: string;
}

export interface AskAnswer {
  summary: string;
  requirements: string[];
  requirements_note: string | null;
  steps: string[];
  office: string | null;
  fee: string | null;
  processing_time: string | null;
}

export type AskIntent = "fee" | "requirements" | "steps" | "office" | "processing_time";

export interface AskSuggestion {
  label: string;
  intent: AskIntent;
}

export interface AskResponse {
  confident: boolean;
  answer: AskAnswer | null;
  message?: string;
  sources: Source[];
  // Optional: present on confident answers. "overview" = full card; a topic = focused answer.
  intent?: AskIntent | "overview";
  suggestions?: AskSuggestion[];
}

export interface ExplainResponse {
  document_type: string | null;
  explanation: string;
  what_is_asked: string[];
  next_steps: string[];
  extracted_text: string | null;
  disclaimer: string;
}

export interface GlossaryEntry {
  en?: string;
  fil?: string;
  ceb?: string;
  needs_review?: boolean;
}

export interface GlossaryUse {
  source: string;
  target: string;
}

export interface TranslateResponse {
  translation: string;
  glossary_terms_used: GlossaryUse[];
}

export type ApiErrorCode =
  | "invalid_request"
  | "payload_too_large"
  | "unsupported_media_type"
  | "rate_limited"
  | "upstream_error"
  | "internal_error";
