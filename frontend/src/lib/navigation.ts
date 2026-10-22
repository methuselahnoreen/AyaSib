// Feature: ayasib-andam-na
// Pure verified-navigation resolver. Derives next step and related links only from existing KB
// fields; invents nothing. Unresolved or duplicate related ids are dropped.
import type { KbEntry } from "./types";

export interface RelatedLink {
  id: string;
  label: string; // name_ceb || name_en
}

export interface Navigation {
  nextStep: string | null;
  related: RelatedLink[];
}

/**
 * Resolves next_step (ceb preferred) and related ids against the KB.
 * - nextStep is entry.next_step_ceb || entry.next_step, or null when neither is present/non-empty.
 * - related ids resolve via the KB; unresolved ids are omitted, duplicates collapse to the first
 *   occurrence, and the first-appearance order of the source `related` array is preserved.
 * - label is the resolved entry's name_ceb when non-empty, otherwise name_en.
 */
export function resolveNavigation(entry: KbEntry, kb: KbEntry[]): Navigation {
  const nextCeb = (entry.next_step_ceb ?? "").trim();
  const nextEn = (entry.next_step ?? "").trim();
  const nextStep = nextCeb || nextEn || null;

  const related: RelatedLink[] = [];
  const seen = new Set<string>();
  const list = Array.isArray(entry.related) ? entry.related : [];
  const index = Array.isArray(kb) ? kb : [];

  for (const id of list) {
    if (typeof id !== "string" || seen.has(id)) continue;
    const target = index.find((e) => e.id === id);
    if (!target) continue; // omit unresolved ids
    seen.add(id);
    const label = (target.name_ceb ?? "").trim() || target.name_en;
    related.push({ id: target.id, label });
  }

  return { nextStep, related };
}
