import type { GlossaryEntry, GlossaryUse, Lang } from "./types";

/** Glossary terms whose source-language form appears in the text. Longest terms first. */
export function findGlossaryTerms(text: string, from: Lang, to: Lang, glossary: GlossaryEntry[]): GlossaryUse[] {
  const lower = text.toLowerCase();
  const found: GlossaryUse[] = [];
  for (const g of glossary) {
    const source = g[from];
    const target = g[to];
    if (source && target && lower.includes(source.toLowerCase())) found.push({ source, target });
  }
  return found.sort((a, b) => b.source.length - a.source.length);
}

/** Keeps only the terms whose required rendering actually appears in the translation. */
export function termsUsed(terms: GlossaryUse[], translation: string): GlossaryUse[] {
  const lower = translation.toLowerCase();
  return terms.filter((t) => lower.includes(t.target.toLowerCase()));
}
