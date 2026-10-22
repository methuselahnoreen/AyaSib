// Feature: ayasib-andam-na
// Mandatory KB validation tests. These spawn the real backend validator (validate-kb.mjs) against
// temporary fixture directories, so they exercise the actual shipped checks end to end.
import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(here, "../../../backend/scripts/validate-kb.mjs");

const tempDirs: string[] = [];

function runValidator(files: Record<string, string>): { code: number; out: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kbval-"));
  tempDirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  const res = spawnSync(process.execPath, [SCRIPT], {
    env: { ...process.env, KB_DIR: dir },
    encoding: "utf8",
  });
  return { code: res.status ?? -1, out: `${res.stdout}${res.stderr}` };
}

afterEach(() => {
  while (tempDirs.length) {
    const dir = tempDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

// A minimal valid entry; override fields per test.
function validEntry(id: string, extra = ""): string {
  return [
    `id: ${id}`,
    `name_en: Test Service`,
    `locality: Cebu City`,
    `summary_ceb: "Usa ka test nga serbisyo."`,
    `source_title: "Test Charter"`,
    `source_url: "https://www.cebucity.gov.ph/transparency/citizens-charter/"`,
    `last_verified: 2026-01-01`,
    `office: null`,
    `fee: null`,
    `processing_time: null`,
    `requirements:`,
    `  - "Valid ID"`,
    `  - "Authorization letter"`,
    `requirements_ceb:`,
    `  - "Valid ID"`,
    `  - "Authorization letter"`,
    extra,
  ].join("\n");
}

describe("validate-kb (optional additive fields)", () => {
  it("empty next_step fails", () => {
    const r = runValidator({ "a.yaml": validEntry("a", 'next_step: ""') });
    expect(r.code).toBe(1);
    expect(r.out).toContain("next_step must be non-empty text");
  });

  it("bad related id (not lowercase-hyphenated) fails", () => {
    const r = runValidator({ "a.yaml": validEntry("a", "related:\n  - Not_An_Id") });
    expect(r.code).toBe(1);
    expect(r.out).toContain("related must be a list of lowercase-hyphenated ids");
  });

  it("unresolved related id fails in the second pass", () => {
    const r = runValidator({ "a.yaml": validEntry("a", "related:\n  - ghost-service") });
    expect(r.code).toBe(1);
    expect(r.out).toContain('related id "ghost-service" does not resolve');
  });

  it("resolvable related id passes", () => {
    const r = runValidator({
      "a.yaml": validEntry("a", "related:\n  - b"),
      "b.yaml": validEntry("b"),
    });
    expect(r.code).toBe(0);
  });

  it("bad review_status value fails", () => {
    const r = runValidator({ "a.yaml": validEntry("a", "review_status: maybe") });
    expect(r.code).toBe(1);
    expect(r.out).toContain("review_status must be one of");
  });

  it("bad review_due date fails", () => {
    const r = runValidator({ "a.yaml": validEntry("a", "review_due: 2026-13-45") });
    expect(r.code).toBe(1);
    expect(r.out).toContain("review_due must be a real date");
  });

  it("valid review_status and review_due pass", () => {
    const r = runValidator({ "a.yaml": validEntry("a", "review_status: needs_review\nreview_due: 2027-01-01") });
    expect(r.code).toBe(0);
  });
});

describe("validate-kb (duplicate-normalized requirements)", () => {
  it("duplicate normalized requirements fail (requirements)", () => {
    const entry = [
      "id: a",
      "name_en: Test",
      "locality: Cebu City",
      'summary_ceb: "x"',
      'source_title: "T"',
      'source_url: "https://www.cebucity.gov.ph/transparency/citizens-charter/"',
      "last_verified: 2026-01-01",
      "office: null",
      "fee: null",
      "processing_time: null",
      "requirements:",
      '  - "Valid ID"',
      '  - "  Valid   ID "',
      "requirements_ceb:",
      '  - "Valid ID ceb"',
      '  - "Other ceb"',
    ].join("\n");
    const r = runValidator({ "a.yaml": entry });
    expect(r.code).toBe(1);
    expect(r.out).toContain("requirements contains duplicate items after normalization");
  });

  it("duplicate normalized requirements fail (requirements_ceb)", () => {
    const entry = [
      "id: a",
      "name_en: Test",
      "locality: Cebu City",
      'summary_ceb: "x"',
      'source_title: "T"',
      'source_url: "https://www.cebucity.gov.ph/transparency/citizens-charter/"',
      "last_verified: 2026-01-01",
      "office: null",
      "fee: null",
      "processing_time: null",
      "requirements:",
      '  - "A"',
      '  - "B"',
      "requirements_ceb:",
      '  - "Valid ID"',
      '  - "Valid ID"',
    ].join("\n");
    const r = runValidator({ "a.yaml": entry });
    expect(r.code).toBe(1);
    expect(r.out).toContain("requirements_ceb contains duplicate items after normalization");
  });
});

describe("validate-kb (backward compatibility)", () => {
  it("all existing KB entries still pass", () => {
    const realKb = path.resolve(here, "../../../kb");
    const res = spawnSync(process.execPath, [SCRIPT], {
      env: { ...process.env, KB_DIR: realKb },
      encoding: "utf8",
    });
    expect(res.status).toBe(0);
    // Every KB file must pass (N of N), independent of how many entries exist.
    const summary = /(\d+) of (\d+) files passed/.exec(res.stdout);
    expect(summary).not.toBeNull();
    expect(summary![1]).toBe(summary![2]); // passed === total
    expect(res.stdout).not.toContain("FAIL");
  });
});
