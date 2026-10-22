import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { resolveNavigation } from "./navigation";
import type { KbEntry } from "./types";

const RUNS = { numRuns: 100 };

function entry(over: Partial<KbEntry> & { id: string }): KbEntry {
  return {
    name_en: "Name " + over.id,
    name_ceb: "",
    locality: "Cebu City",
    requirements: ["r"],
    fee: "",
    office: "",
    processing_time: "",
    source_url: "https://example.org",
    last_verified: "2026-01-01",
    notes: "",
    who_may_avail: "",
    scope_note: "",
    requirements_note: "",
    steps: [],
    source_title: "Source",
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

const idArb = fc.stringMatching(/^[a-z0-9]+(-[a-z0-9]+)*$/).filter((s) => s.length > 0 && s.length < 20);

describe("navigation", () => {
  // Feature: ayasib-andam-na, Property 9: Navigation resolves only existing, deduplicated, ordered related ids
  it("Property 9: resolves existing ids, dedupes, preserves first-appearance order", () => {
    fc.assert(
      fc.property(fc.uniqueArray(idArb, { minLength: 1, maxLength: 6 }), fc.array(fc.nat(10), { maxLength: 10 }), (kbIds, picks) => {
        const kb = kbIds.map((id) => entry({ id }));
        const subject = entry({ id: "subject" });

        // Build a related list that references some existing ids (possibly repeated) and some missing ones.
        const related: string[] = [];
        for (const p of picks) {
          if (p < kbIds.length) related.push(kbIds[p]);
          else related.push("missing-" + p);
        }
        subject.related = related;
        const nav = resolveNavigation(subject, [subject, ...kb]);

        // Expected: unique existing ids in first-appearance order.
        const expected: string[] = [];
        const seen = new Set<string>();
        for (const id of related) {
          if (kbIds.includes(id) && !seen.has(id)) {
            seen.add(id);
            expected.push(id);
          }
        }
        expect(nav.related.map((r) => r.id)).toEqual(expected);
        // Every resolved link targets an existing entry and carries a non-empty label.
        nav.related.forEach((link) => {
          expect(kbIds).toContain(link.id);
          expect(link.label.length).toBeGreaterThan(0);
        });
      }),
      RUNS,
    );
  });

  // Feature: ayasib-andam-na, Property 10: Navigation never invents a next step
  it("Property 10: nextStep is a source field or null, never fabricated", () => {
    const nonEmpty = fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0);
    fc.assert(
      fc.property(fc.option(nonEmpty, { nil: undefined }), fc.option(nonEmpty, { nil: undefined }), (ceb, en) => {
        const subject = entry({ id: "subject", next_step_ceb: ceb, next_step: en });
        const nav = resolveNavigation(subject, [subject]);
        const verified = (ceb ?? "").trim() || (en ?? "").trim();
        if (verified) expect(nav.nextStep).toBe(verified);
        else expect(nav.nextStep).toBeNull();
      }),
      RUNS,
    );
  });
});

describe("navigation edge cases", () => {
  it("omits related when absent, empty, or fully unresolved", () => {
    const s = entry({ id: "s" });
    expect(resolveNavigation(s, [s]).related).toEqual([]);
    expect(resolveNavigation(entry({ id: "s", related: [] }), [s]).related).toEqual([]);
    expect(resolveNavigation(entry({ id: "s", related: ["ghost"] }), [s]).related).toEqual([]);
  });

  it("uses name_ceb for the label when present, else name_en", () => {
    const target = entry({ id: "t", name_en: "English", name_ceb: "Binisaya" });
    const s = entry({ id: "s", related: ["t"] });
    expect(resolveNavigation(s, [s, target]).related[0].label).toBe("Binisaya");
    const targetNoCeb = entry({ id: "t", name_en: "English", name_ceb: "" });
    expect(resolveNavigation(s, [s, targetNoCeb]).related[0].label).toBe("English");
  });
});
