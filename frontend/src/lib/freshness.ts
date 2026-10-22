// Feature: ayasib-andam-na
// Pure freshness + information-status logic. Derives everything from last_verified, review_status,
// and review_due only; never fabricates a date or a status.
import type { KbEntry } from "./types";

const DEFAULT_THRESHOLD_DAYS = 180;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Reads the single configurable stale threshold; default 180 when absent or not a positive whole number of days. */
export function readStaleThreshold(): number {
  const raw =
    typeof process !== "undefined" && process.env
      ? process.env.NEXT_PUBLIC_STALE_THRESHOLD_DAYS ?? process.env.STALE_THRESHOLD_DAYS
      : undefined;
  return coerceThreshold(raw);
}

function coerceThreshold(raw: unknown): number {
  if (typeof raw !== "string" || raw.trim() === "") return DEFAULT_THRESHOLD_DAYS;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return DEFAULT_THRESHOLD_DAYS;
  return n;
}

export const STALE_THRESHOLD_DAYS = readStaleThreshold();

export type Freshness =
  | { kind: "unavailable" }
  | { kind: "fresh"; verified: string; ageDays: number }
  | { kind: "stale"; verified: string; ageDays: number };

/** Parses a YYYY-MM-DD string to a UTC epoch, or null if it is not a real calendar date. */
function parseDate(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(ms)) return null;
  // Reject values that are not round-trip real dates (e.g. 2026-02-31).
  if (new Date(ms).toISOString().slice(0, 10) !== value) return null;
  return ms;
}

/**
 * Evaluates last_verified against the threshold.
 * - unavailable: missing, unparseable, or future (carries no date, never implies freshness).
 * - stale: age in days strictly greater than the threshold.
 * - fresh: age in days less than or equal to the threshold.
 * `now` defaults to Date.now() for testability.
 */
export function evaluate(lastVerified: string | undefined | null, thresholdDays?: number, now?: number): Freshness {
  const threshold = thresholdDays === undefined ? STALE_THRESHOLD_DAYS : coerceThreshold(String(thresholdDays));
  const verifiedMs = parseDate(lastVerified);
  const nowMs = now === undefined ? Date.now() : now;
  if (verifiedMs === null) return { kind: "unavailable" };
  if (verifiedMs > nowMs) return { kind: "unavailable" };
  const ageDays = Math.floor((nowMs - verifiedMs) / MS_PER_DAY);
  if (ageDays > threshold) return { kind: "stale", verified: lastVerified as string, ageDays };
  return { kind: "fresh", verified: lastVerified as string, ageDays };
}

export type InformationStatus = "verified" | "needs_review" | "unconfirmed" | "unavailable";

/**
 * Freshness Policy precedence:
 *   1. review_status === "unconfirmed"  -> unconfirmed
 *   2. review_status === "needs_review" OR (review_due present AND on/before today) OR evaluate() stale -> needs_review
 *   3. evaluate() fresh -> verified
 *   4. else (evaluate() unavailable) -> unavailable
 * When review_status and review_due are both absent, this reduces exactly to the fresh/stale/unavailable mapping.
 */
export function informationStatus(entry: KbEntry, thresholdDays?: number, now?: number): InformationStatus {
  const nowMs = now === undefined ? Date.now() : now;
  const fresh = evaluate(entry.last_verified, thresholdDays, nowMs);

  if (entry.review_status === "unconfirmed") return "unconfirmed";

  const dueMs = parseDate(entry.review_due);
  const dueOnOrBeforeToday = dueMs !== null && dueMs <= nowMs;
  if (entry.review_status === "needs_review" || dueOnOrBeforeToday || fresh.kind === "stale") {
    return "needs_review";
  }

  if (fresh.kind === "fresh") return "verified";
  return "unavailable";
}
