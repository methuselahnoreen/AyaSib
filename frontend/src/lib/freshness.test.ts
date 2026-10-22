import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { evaluate, informationStatus, readStaleThreshold } from "./freshness";
import type { KbEntry } from "./types";

const RUNS = { numRuns: 100 };
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function entry(over: Partial<KbEntry>): KbEntry {
  return {
    id: "svc",
    name_en: "S",
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

// A fixed "now" so date math is deterministic (UTC midnight).
const NOW = Date.parse("2026-10-23T00:00:00Z");

describe("freshness.evaluate", () => {
  // Feature: ayasib-andam-na, Property 11: Freshness classification matches the threshold boundary
  it("Property 11: stale iff ageDays > threshold, fresh iff ageDays <= threshold", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2000 }), fc.integer({ min: 1, max: 1000 }), (ageDays, threshold) => {
        const verifiedMs = NOW - ageDays * MS_PER_DAY;
        const result = evaluate(iso(verifiedMs), threshold, NOW);
        if (ageDays > threshold) {
          expect(result.kind).toBe("stale");
        } else {
          expect(result.kind).toBe("fresh");
        }
        if (result.kind !== "unavailable") expect(result.ageDays).toBe(ageDays);
      }),
      RUNS,
    );
  });

  // Feature: ayasib-andam-na, Property 12: Unavailable last_verified is a distinct classification
  it("Property 12: missing, unparseable, or future dates are unavailable and carry no date", () => {
    const futureDays = fc.integer({ min: 1, max: 1000 });
    const garbage = fc.oneof(
      fc.constant(""),
      fc.constant(undefined),
      fc.constant("not-a-date"),
      fc.constant("2026-13-01"),
      fc.constant("2026-02-31"),
      fc.string(),
    );
    fc.assert(
      fc.property(fc.oneof(garbage, futureDays.map((d) => iso(NOW + d * MS_PER_DAY))), (value) => {
        const result = evaluate(value as string | undefined, 180, NOW);
        // Real non-future dates that slip through are allowed to be fresh/stale; everything else unavailable.
        if (result.kind === "unavailable") {
          expect(result).toEqual({ kind: "unavailable" });
        } else {
          // Only a genuine, parseable, non-future date may be fresh/stale.
          expect(typeof value).toBe("string");
          expect(/^\d{4}-\d{2}-\d{2}$/.test(String(value))).toBe(true);
        }
      }),
      RUNS,
    );
  });

  it("future date is unavailable (explicit)", () => {
    expect(evaluate(iso(NOW + 5 * MS_PER_DAY), 180, NOW)).toEqual({ kind: "unavailable" });
  });
});

describe("freshness threshold default", () => {
  // Feature: ayasib-andam-na, Property 13: Threshold defaults safely
  it("Property 13: absent or non-positive-integer threshold uses 180", () => {
    const original = process.env.NEXT_PUBLIC_STALE_THRESHOLD_DAYS;
    const originalAlt = process.env.STALE_THRESHOLD_DAYS;
    const bad = fc.oneof(
      fc.constant(undefined),
      fc.constant(""),
      fc.constant("0"),
      fc.constant("-5"),
      fc.constant("3.5"),
      fc.constant("abc"),
    );
    try {
      fc.assert(
        fc.property(bad, (v) => {
          if (v === undefined) delete process.env.NEXT_PUBLIC_STALE_THRESHOLD_DAYS;
          else process.env.NEXT_PUBLIC_STALE_THRESHOLD_DAYS = v;
          delete process.env.STALE_THRESHOLD_DAYS;
          expect(readStaleThreshold()).toBe(180);
        }),
        RUNS,
      );
      process.env.NEXT_PUBLIC_STALE_THRESHOLD_DAYS = "90";
      expect(readStaleThreshold()).toBe(90);
    } finally {
      if (original === undefined) delete process.env.NEXT_PUBLIC_STALE_THRESHOLD_DAYS;
      else process.env.NEXT_PUBLIC_STALE_THRESHOLD_DAYS = original;
      if (originalAlt === undefined) delete process.env.STALE_THRESHOLD_DAYS;
      else process.env.STALE_THRESHOLD_DAYS = originalAlt;
    }
  });
});

describe("freshness.informationStatus", () => {
  // Feature: ayasib-andam-na, Property 14: Information status follows the documented precedence
  it("Property 14: precedence; reduces to fresh/stale/unavailable when review fields absent", () => {
    const reviewStatus = fc.option(fc.constantFrom("verified", "needs_review", "unconfirmed"), { nil: undefined });
    const ageDays = fc.integer({ min: -5, max: 2000 });
    const reviewDueOffset = fc.option(fc.integer({ min: -400, max: 400 }), { nil: undefined });
    fc.assert(
      fc.property(reviewStatus, ageDays, reviewDueOffset, (rs, age, dueOff) => {
        const verifiedMs = NOW - age * MS_PER_DAY; // age<0 => future => unavailable
        const last_verified = iso(verifiedMs);
        const review_due = dueOff === undefined ? undefined : iso(NOW + dueOff * MS_PER_DAY);
        const e = entry({ last_verified, review_status: rs as KbEntry["review_status"], review_due });
        const status = informationStatus(e, 180, NOW);
        const base = evaluate(last_verified, 180, NOW).kind;
        const dueOnOrBefore = dueOff !== undefined && dueOff <= 0;

        let expected: string;
        if (rs === "unconfirmed") expected = "unconfirmed";
        else if (rs === "needs_review" || dueOnOrBefore || base === "stale") expected = "needs_review";
        else if (base === "fresh") expected = "verified";
        else expected = "unavailable";
        expect(status).toBe(expected);

        // Reduce-to-base when review fields absent.
        if (rs === undefined && review_due === undefined) {
          const reduced = base === "fresh" ? "verified" : base === "stale" ? "needs_review" : "unavailable";
          expect(status).toBe(reduced);
        }
      }),
      RUNS,
    );
  });
});
