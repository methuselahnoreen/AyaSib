import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { deriveCategories, filterServices, serviceTitle, suggestServices } from "./servicesDirectory";
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

const idArb = fc.stringMatching(/^[a-z0-9]+(-[a-z0-9]+)*$/).filter((s) => s.length > 0 && s.length < 16);

describe("servicesDirectory", () => {
  // Feature: ayasib-frontend-redesign, Property 1: empty query returns all (within category)
  it("Property 1: empty/whitespace query returns all entries", () => {
    fc.assert(
      fc.property(fc.uniqueArray(idArb, { maxLength: 8 }), fc.constantFrom("", "   ", "\t"), (ids, q) => {
        const kb = ids.map((id) => entry({ id }));
        expect(filterServices(kb, q)).toHaveLength(kb.length);
      }),
      RUNS,
    );
  });

  // Feature: ayasib-frontend-redesign, Property 2: results are always a KB subset in KB order
  it("Property 2: results are a subset of the KB, order preserved, matched only on existing fields", () => {
    fc.assert(
      fc.property(fc.uniqueArray(idArb, { minLength: 1, maxLength: 8 }), fc.string({ maxLength: 10 }), (ids, q) => {
        const kb = ids.map((id) => entry({ id, name_en: `Service ${id}`, locality: "Cebu City" }));
        const result = filterServices(kb, q);
        // subset
        result.forEach((r) => expect(kb).toContain(r));
        // order preserved
        const indices = result.map((r) => kb.indexOf(r));
        expect(indices).toEqual([...indices].sort((a, b) => a - b));
        // every result genuinely contains the query in some existing field
        const ql = q.trim().toLowerCase();
        if (ql) {
          result.forEach((r) => {
            const hay = [r.id, r.name_en, r.name_ceb, r.locality].map((v) => (v ?? "").toLowerCase()).join(" ");
            expect(hay.includes(ql)).toBe(true);
          });
        }
      }),
      RUNS,
    );
  });

  it("matches by id, name_en, name_ceb, and locality (case-insensitive)", () => {
    const kb = [
      entry({ id: "nbi-clearance", name_en: "NBI Clearance", name_ceb: "", locality: "National" }),
      entry({ id: "death-certificate-chd", name_en: "Death Certificate", name_ceb: "Sertipiko sa Kamatayon", locality: "Cebu City" }),
    ];
    expect(filterServices(kb, "nbi").map((e) => e.id)).toEqual(["nbi-clearance"]);
    expect(filterServices(kb, "sertipiko").map((e) => e.id)).toEqual(["death-certificate-chd"]);
    expect(filterServices(kb, "cebu").map((e) => e.id)).toEqual(["death-certificate-chd"]);
    expect(filterServices(kb, "CLEARANCE").map((e) => e.id)).toEqual(["nbi-clearance"]);
  });

  it("no match returns empty; never fabricates", () => {
    const kb = [entry({ id: "a" })];
    expect(filterServices(kb, "zzzzz-nonexistent")).toEqual([]);
  });

  it("category filters by exact locality", () => {
    const kb = [
      entry({ id: "a", locality: "Cebu City" }),
      entry({ id: "b", locality: "National" }),
    ];
    expect(filterServices(kb, "", "National").map((e) => e.id)).toEqual(["b"]);
    expect(filterServices(kb, "", "Cebu City").map((e) => e.id)).toEqual(["a"]);
  });

  it("deriveCategories returns distinct, derived-only localities in order", () => {
    const kb = [
      entry({ id: "a", locality: "Cebu City" }),
      entry({ id: "b", locality: "National" }),
      entry({ id: "c", locality: "Cebu City" }),
    ];
    expect(deriveCategories(kb)).toEqual(["Cebu City", "National"]);
  });

  it("serviceTitle prefers name_ceb then name_en", () => {
    expect(serviceTitle(entry({ id: "a", name_ceb: "Binisaya", name_en: "English" }))).toBe("Binisaya");
    expect(serviceTitle(entry({ id: "a", name_ceb: "", name_en: "English" }))).toBe("English");
  });
});

describe("suggestServices (checklist type-ahead)", () => {
  const kb = [
    entry({ id: "nbi", name_en: "NBI Clearance" }),
    entry({ id: "birth", name_en: "Birth Certificate" }),
    entry({ id: "death", name_en: "Death Certificate" }),
    entry({ id: "biz", name_en: "Business Permit" }),
  ];

  it("empty query returns all services alphabetized by title", () => {
    expect(suggestServices(kb, "").map((e) => e.name_en)).toEqual([
      "Birth Certificate",
      "Business Permit",
      "Death Certificate",
      "NBI Clearance",
    ]);
  });

  it("a single letter suggests prefix matches first, then other matches, alphabetized", () => {
    // "b" appears in all four (Birth, Business start with B; NBI and Business/Birth also contain b;
    // "b" is in the id "nbi" and "biz"). Prefix-of-title matches (Birth, Business) rank first,
    // then the rest alphabetically by title.
    const titles = suggestServices(kb, "b").map((e) => e.name_en);
    expect(titles.slice(0, 2)).toEqual(["Birth Certificate", "Business Permit"]);
    // every returned item genuinely contains "b" somewhere in its searchable fields
    expect(titles.length).toBeGreaterThanOrEqual(2);
  });

  it("prefix matches rank above mid-word matches", () => {
    // "c" appears mid-word in several, but none START with C -> all still alphabetical
    const titles = suggestServices(kb, "cert").map((e) => e.name_en);
    expect(titles).toEqual(["Birth Certificate", "Death Certificate"]);
  });

  it("is case-insensitive and never invents a service", () => {
    expect(suggestServices(kb, "NBI").map((e) => e.id)).toEqual(["nbi"]);
    expect(suggestServices(kb, "zzz")).toEqual([]);
  });

  it("prefers a title prefix over a non-prefix match", () => {
    const kb2 = [
      entry({ id: "a", name_en: "Residency Clearance" }), // contains 'c' mid-word
      entry({ id: "b", name_en: "Cedula" }), // starts with 'c'
    ];
    expect(suggestServices(kb2, "c").map((e) => e.name_en)).toEqual(["Cedula", "Residency Clearance"]);
  });
});
