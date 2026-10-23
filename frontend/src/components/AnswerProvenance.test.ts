// Feature: ayasib-answer-provenance
import { describe, expect, it } from "vitest";
import { provenanceView } from "@/lib/provenance";
import type { KbEntry, Source } from "@/lib/types";

const NOW = Date.parse("2026-10-23T00:00:00Z");

function entry(over: Partial<KbEntry>): KbEntry {
  return {
    id: "svc",
    name_en: "Service",
    name_ceb: "",
    locality: "Cebu City",
    who_may_avail: "",
    scope_note: "",
    requirements: ["r"],
    requirements_note: "",
    steps: [],
    fee: "",
    office: "",
    processing_time: "",
    source_title: "Src",
    source_url: "https://example.org",
    last_verified: "2026-10-01",
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

describe("provenanceView", () => {
  it("shows a verified status and the real date for a fresh entry", () => {
    const v = provenanceView(entry({ last_verified: "2026-10-01" }), undefined, NOW);
    expect(v.status).toBe("verified");
    expect(v.dateValid).toBe(true);
    expect(v.date).toBe("2026-10-01");
  });

  it("flags needs_review for a stale date (older than threshold)", () => {
    const v = provenanceView(entry({ last_verified: "2020-01-01" }), undefined, NOW);
    expect(v.status).toBe("needs_review");
    expect(v.dateValid).toBe(true);
  });

  it("never fabricates a date: missing last_verified is unavailable with no date", () => {
    const v = provenanceView(entry({ last_verified: "" }), undefined, NOW);
    expect(v.status).toBe("unavailable");
    expect(v.dateValid).toBe(false);
    expect(v.date).toBeNull();
  });

  it("treats a future date as unavailable (no implied freshness)", () => {
    const v = provenanceView(entry({ last_verified: "2099-01-01" }), undefined, NOW);
    expect(v.status).toBe("unavailable");
    expect(v.dateValid).toBe(false);
  });

  it("honors review_status unconfirmed over a valid date", () => {
    const v = provenanceView(entry({ last_verified: "2026-10-01", review_status: "unconfirmed" }), undefined, NOW);
    expect(v.status).toBe("unconfirmed");
  });

  it("with no resolved entry, falls back to the source date and reports unavailable status", () => {
    const src: Source = { title: "Cebu Charter", url: "https://example.org", last_verified: "2026-10-01" };
    const v = provenanceView(null, src, NOW);
    expect(v.status).toBe("unavailable"); // no entry => cannot assert a verified status
    expect(v.dateValid).toBe(true); // but the source's date is shown rather than hidden
    expect(v.date).toBe("2026-10-01");
  });
});
