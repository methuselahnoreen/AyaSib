import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  counts,
  deriveItems,
  hasNoRequirements,
  isComplete,
  nextRecommendedAction,
  normalizeRequirement,
  requirementKey,
  type ItemState,
} from "./readiness";
import type { KbEntry } from "./types";
import { t } from "./strings";

const RUNS = { numRuns: 100 };

function baseEntry(over: Partial<KbEntry>): KbEntry {
  return {
    id: "svc",
    name_en: "Service",
    name_ceb: "",
    locality: "Cebu City",
    who_may_avail: "",
    scope_note: "",
    requirements: [],
    requirements_note: "",
    steps: [],
    fee: "",
    office: "",
    processing_time: "",
    source_title: "Source",
    source_url: "https://example.org",
    last_verified: "2026-01-01",
    notes: "",
    summary_ceb: "",
    requirements_ceb: [],
    requirements_note_ceb: "",
    steps_ceb: [],
    office_ceb: "",
    fee_ceb: "",
    processing_time_ceb: "",
    ...over,
  };
}

// Arbitraries that produce non-empty, normalized-distinct requirement lists (the validator
// guarantees distinct normalized text within an entry, so tests model valid entries).
const reqText = fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0);
const distinctReqList = fc
  .uniqueArray(reqText, { minLength: 1, maxLength: 8, selector: (s) => normalizeRequirement(s) })
  .filter((arr) => arr.length > 0);

const stateArb: fc.Arbitrary<ItemState> = fc.constantFrom("HAS", "STILL_NEEDS", "NEEDS_TO_CONFIRM");

describe("readiness derivation", () => {
  // Feature: ayasib-andam-na, Property 1: Checklist mirrors the source requirements list
  it("Property 1: mirrors the source list (count, order, verbatim text, ceb preferred)", () => {
    fc.assert(
      fc.property(distinctReqList, distinctReqList, fc.boolean(), (reqs, ceb, useCeb) => {
        const entry = baseEntry(useCeb ? { requirements: reqs, requirements_ceb: ceb } : { requirements: reqs });
        const source = useCeb ? ceb : reqs;
        const items = deriveItems(entry, {});
        expect(items).toHaveLength(source.length);
        items.forEach((item, i) => {
          expect(item.text).toBe(source[i]);
          expect(item.index).toBe(i);
        });
      }),
      RUNS,
    );
  });

  // Feature: ayasib-andam-na, Property 2: Default and stored state resolution by stable key
  it("Property 2: resolves state by stable key; defaults STILL_NEEDS; ignores orphan keys", () => {
    fc.assert(
      fc.property(distinctReqList, fc.dictionary(fc.string(), stateArb), (reqs, rawStored) => {
        const entry = baseEntry({ requirements: reqs });
        // Build a stored map keyed by real requirementKeys for a subset, plus guaranteed-orphan keys.
        const stored: Record<string, ItemState> = {};
        reqs.forEach((r, i) => {
          if (i % 2 === 0) stored[requirementKey(r)] = "HAS";
        });
        const orphanKey = "orphan-" + requirementKey("\u0000no-such-requirement\u0000");
        stored[orphanKey] = "NEEDS_TO_CONFIRM";
        Object.assign(stored, rawStored); // random extra keys must be harmless

        const items = deriveItems(entry, stored);
        items.forEach((item) => {
          expect(["HAS", "STILL_NEEDS", "NEEDS_TO_CONFIRM"]).toContain(item.state);
          const saved = stored[item.key];
          if (saved === "HAS" || saved === "STILL_NEEDS" || saved === "NEEDS_TO_CONFIRM") {
            expect(item.state).toBe(saved);
          } else {
            expect(item.state).toBe("STILL_NEEDS");
          }
        });
        // Orphan key must never appear as an item key.
        expect(items.some((i) => i.key === orphanKey)).toBe(false);
      }),
      RUNS,
    );
  });

  // Feature: ayasib-andam-na, Property 3: Completeness requires a non-empty all-HAS list
  it("Property 3: isComplete true iff non-empty and all HAS", () => {
    fc.assert(
      fc.property(fc.array(stateArb, { maxLength: 10 }), (states) => {
        const items = states.map((state, index) => ({ index, key: `k${index}`, text: `r${index}`, state }));
        const expected = items.length > 0 && items.every((i) => i.state === "HAS");
        expect(isComplete(items)).toBe(expected);
      }),
      RUNS,
    );
  });

  // Feature: ayasib-andam-na, Property 4: State counts are exhaustive and consistent
  it("Property 4: counts sum to length and match per-state totals", () => {
    fc.assert(
      fc.property(fc.array(stateArb, { maxLength: 12 }), (states) => {
        const items = states.map((state, index) => ({ index, key: `k${index}`, text: `r${index}`, state }));
        const c = counts(items);
        expect(c.HAS + c.STILL_NEEDS + c.NEEDS_TO_CONFIRM).toBe(items.length);
        expect(c.HAS).toBe(states.filter((s) => s === "HAS").length);
        expect(c.STILL_NEEDS).toBe(states.filter((s) => s === "STILL_NEEDS").length);
        expect(c.NEEDS_TO_CONFIRM).toBe(states.filter((s) => s === "NEEDS_TO_CONFIRM").length);
      }),
      RUNS,
    );
  });

  // Feature: ayasib-andam-na, Property 15: Next recommended action never invents and falls back safely
  it("Property 15: nextRecommendedAction uses verified step when present, else a safe non-invented fallback", () => {
    const uiStrings = new Set<string>([
      t.readiness.nextActionReady,
      t.readiness.nextActionGather,
      t.readiness.nextActionConfirm,
      t.readiness.nextActionFallback,
    ]);
    fc.assert(
      fc.property(
        distinctReqList,
        fc.array(stateArb, { maxLength: 8 }),
        fc.option(fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0), { nil: undefined }),
        fc.option(fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0), { nil: undefined }),
        (reqs, states, nextCeb, nextEn) => {
          const entry = baseEntry({ requirements: reqs, next_step_ceb: nextCeb, next_step: nextEn });
          const items = reqs.map((text, index) => ({
            index,
            key: requirementKey(text),
            text,
            state: states[index] ?? ("STILL_NEEDS" as ItemState),
          }));
          const action = nextRecommendedAction(entry, items);
          const verified = (nextCeb ?? "").trim() || (nextEn ?? "").trim();
          if (verified) {
            expect(action).toBe(verified);
          } else {
            // No verified step: must be one of the predefined safe strings, never fabricated content.
            expect(uiStrings.has(action)).toBe(true);
          }
        },
      ),
      RUNS,
    );
  });
});

describe("readiness edge cases", () => {
  it("reports no requirements for an empty or missing list", () => {
    expect(hasNoRequirements(baseEntry({ requirements: [] }))).toBe(true);
    expect(hasNoRequirements(baseEntry({ requirements: ["a"] }))).toBe(false);
    expect(hasNoRequirements(baseEntry({ requirements: [], requirements_ceb: ["x"] }))).toBe(false);
  });

  it("isComplete is false for an empty list", () => {
    expect(isComplete([])).toBe(false);
  });

  it("normalizeRequirement trims and collapses whitespace but preserves case and punctuation", () => {
    expect(normalizeRequirement("  Valid   ID ")).toBe("Valid ID");
    expect(requirementKey("  Valid   ID ")).toBe(requirementKey("Valid ID"));
    expect(requirementKey("Valid ID")).not.toBe(requirementKey("valid id"));
  });
});
