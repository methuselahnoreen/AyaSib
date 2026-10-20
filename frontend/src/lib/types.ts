export type Lang = "en" | "fil" | "ceb";

export interface KbEntry {
  id: string;
  name_en: string;
  name_ceb: string;
  locality: string;
  requirements: string[];
  fee: string;
  office: string;
  processing_time: string;
  source_url: string;
  last_verified: string;
  notes: string;
}

export interface Source {
  title: string;
  url: string;
  last_verified: string;
}

export interface AskAnswer {
  summary: string;
  requirements: string[];
  office: string | null;
  fee: string | null;
  processing_time: string | null;
}

export interface AskResponse {
  confident: boolean;
  answer: AskAnswer | null;
  message?: string;
  sources: Source[];
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
