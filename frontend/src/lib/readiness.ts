// Feature: ayasib-andam-na
// Pure readiness-checklist derivation and state logic. No I/O, no DOM.
// Every fact is derived only from existing KB fields; nothing is invented.
import type { KbEntry } from "./types";
import { t } from "./strings";

export type ItemState = "HAS" | "STILL_NEEDS" | "NEEDS_TO_CONFIRM";

/** A single checklist item. `key` is a stable identity derived from the requirement text, not the array index. */
export interface ChecklistItem {
  index: number;
  key: string;
  text: string;
  state: ItemState;
}

/**
 * Trims leading/trailing whitespace and collapses internal whitespace runs to a single space.
 * Preserves case and punctuation (no case folding, no punctuation changes). Deterministic and pure.
 * This is the exact rule the validator's duplicate-requirement check relies on.
 */
export function normalizeRequirement(text: string): string {
  return String(text ?? "").trim().replace(/\s+/g, " ");
}

/**
 * Stable identity for a requirement: a short, stable hash of normalizeRequirement(text).
 * Deterministic across reorders and sessions; different normalized text yields different keys.
 */
export function requirementKey(text: string): string {
  const normalized = normalizeRequirement(text);
  // FNV-1a 32-bit hash over UTF-16 code units — small, stable, dependency-free.
  let h = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i += 1) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Returns the source requirement list: `requirements_ceb` when non-empty, otherwise `requirements`. */
function sourceList(entry: KbEntry): string[] {
  const ceb = entry.requirements_ceb;
  if (Array.isArray(ceb) && ceb.length > 0) return ceb;
  const en = entry.requirements;
  return Array.isArray(en) ? en : [];
}

/** True when the source list (requirements_ceb || requirements) is empty/missing. */
export function hasNoRequirements(entry: KbEntry): boolean {
  return sourceList(entry).length === 0;
}

/**
 * One item per requirements_ceb element, falling back to requirements. Same order, same count,
 * verbatim text. `stored` is keyed by requirementKey, so state follows the requirement text, not
 * its position. An item whose key has no stored value defaults to STILL_NEEDS. A stored entry whose
 * key matches no current item is never read.
 */
export function deriveItems(entry: KbEntry, stored: Record<string, ItemState>): ChecklistItem[] {
  const safeStored = stored && typeof stored === "object" ? stored : {};
  return sourceList(entry).map((text, index) => {
    const key = requirementKey(text);
    const saved = safeStored[key];
    const state: ItemState = saved === "HAS" || saved === "NEEDS_TO_CONFIRM" || saved === "STILL_NEEDS" ? saved : "STILL_NEEDS";
    return { index, key, text, state };
  });
}

/** Counts per state across items. Always exhaustive: the three counts sum to items.length. */
export function counts(items: ChecklistItem[]): Record<ItemState, number> {
  const out: Record<ItemState, number> = { HAS: 0, STILL_NEEDS: 0, NEEDS_TO_CONFIRM: 0 };
  for (const item of items) out[item.state] += 1;
  return out;
}

/** True only when every item is HAS AND there is at least one item. */
export function isComplete(items: ChecklistItem[]): boolean {
  return items.length > 0 && items.every((item) => item.state === "HAS");
}

/**
 * Verified-only next hint; safe fallback. Never invents an action and never claims eligibility or
 * acceptance. Prefers the entry's own next_step_ceb/next_step; otherwise guidance based on remaining
 * STILL_NEEDS/NEEDS_TO_CONFIRM counts; otherwise the generic "confirm with the office" fallback.
 */
export function nextRecommendedAction(entry: KbEntry, items: ChecklistItem[]): string {
  const verified = (entry.next_step_ceb ?? "").trim() || (entry.next_step ?? "").trim();
  if (verified) return verified;

  const c = counts(items);
  const remaining = c.STILL_NEEDS + c.NEEDS_TO_CONFIRM;
  if (items.length > 0 && remaining === 0) {
    // All HAS: do not claim acceptance — point the user to confirm at the office.
    return t.readiness.nextActionReady;
  }
  if (c.NEEDS_TO_CONFIRM > 0 && c.STILL_NEEDS === 0) {
    return t.readiness.nextActionConfirm;
  }
  if (remaining > 0) {
    return t.readiness.nextActionGather;
  }
  // No items at all, or no verified step: generic safe fallback.
  return t.readiness.nextActionFallback;
}
