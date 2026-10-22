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
