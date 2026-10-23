// Feature: ayasib-frontend-redesign
// Pure services-directory logic. Reads only existing KB fields; invents no service or category.
import type { KbEntry } from "./types";

/** Display title for a service: Cebuano name when present, else English. */
export function serviceTitle(entry: KbEntry): string {
  return (entry.name_ceb ?? "").trim() || entry.name_en;
}

/** Distinct localities as category options, derived only from existing KB data; stable order. */
export function deriveCategories(kb: KbEntry[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of Array.isArray(kb) ? kb : []) {
    const loc = (entry.locality ?? "").trim();
    if (loc && !seen.has(loc)) {
      seen.add(loc);
      out.push(loc);
    }
  }
  return out;
}

/**
 * Type-ahead suggestions for the checklist picker. Matches the query against the display title
 * (name_ceb || name_en) and also id/English name/locality, then sorts ALPHABETICALLY by display
 * title. Prefix matches rank above mid-word matches so "b" surfaces titles starting with B first.
 * Empty query returns all services, alphabetized. KB-only; invents nothing.
 */
export function suggestServices(kb: KbEntry[], query: string): KbEntry[] {
  const list = Array.isArray(kb) ? kb : [];
  const q = (query ?? "").trim().toLowerCase();

  const matched = list.filter((entry) => {
    if (!q) return true;
    const haystack = [serviceTitle(entry), entry.id, entry.name_en, entry.locality]
      .map((v) => (v ?? "").toLowerCase())
      .join(" ");
    return haystack.includes(q);
  });

  const titleOf = (e: KbEntry) => serviceTitle(e).toLowerCase();
  return matched.sort((a, b) => {
    if (q) {
      // Titles whose display name starts with the query come first.
      const aStarts = titleOf(a).startsWith(q);
      const bStarts = titleOf(b).startsWith(q);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
    }
    return titleOf(a).localeCompare(titleOf(b));
  });
}

/**
 * Case-insensitive match over id, name_en, name_ceb, and locality.
 * Empty/whitespace query returns all (optionally filtered by category). Category, when given,
 * must equal the entry's locality exactly. Preserves KB order; invents nothing.
 */
export function filterServices(kb: KbEntry[], query: string, category?: string | null): KbEntry[] {
  const list = Array.isArray(kb) ? kb : [];
  const q = (query ?? "").trim().toLowerCase();
  const cat = (category ?? "").trim();

  return list.filter((entry) => {
    if (cat && (entry.locality ?? "").trim() !== cat) return false;
    if (!q) return true;
    const haystack = [entry.id, entry.name_en, entry.name_ceb, entry.locality]
      .map((v) => (v ?? "").toLowerCase())
      .join(" ");
    return haystack.includes(q);
  });
}
