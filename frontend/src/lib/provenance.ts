// Feature: ayasib-answer-provenance
// Pure decision for the "Why trust this answer?" block. No JSX/DOM so it is unit-testable in node.
// Never fabricates a date: an invalid/missing/future last_verified yields dateValid=false.
import { evaluate, informationStatus, type InformationStatus } from "./freshness";
import type { KbEntry, Source } from "./types";

export interface ProvenanceView {
  status: InformationStatus;
  dateValid: boolean;
  date: string | null;
}

/**
 * `entry` is the resolved KB record for the answer (or null if it couldn't be matched).
 * `source` is the answer's source descriptor (title/url/last_verified) from the API response.
 * Status comes from the resolved entry's freshness policy; the date falls back to the source's
 * last_verified when there is no entry. `now` is injectable for tests.
 */
export function provenanceView(entry: KbEntry | null, source: Source | undefined, now?: number): ProvenanceView {
  const status: InformationStatus = entry ? informationStatus(entry, undefined, now) : "unavailable";
  const fresh = evaluate(entry?.last_verified ?? source?.last_verified, undefined, now);
  const dateValid = fresh.kind !== "unavailable";
  return { status, dateValid, date: dateValid ? fresh.verified : null };
}
