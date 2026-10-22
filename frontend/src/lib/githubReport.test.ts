import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { buildGithubIssueUrl } from "./githubReport";

const RUNS = { numRuns: 100 };

describe("githubReport", () => {
  // Feature: ayasib-andam-na, Property 16: GitHub issue URL is well-formed or safely absent
  it("Property 16: null when repo unset; else encoded URL targeting the repo with id/field/explanation/source", () => {
    const text = fc.string({ maxLength: 60 });
    fc.assert(
      fc.property(
        fc.option(fc.constantFrom("methuselahnoreen/AyaSib", "owner/name"), { nil: null }),
        text,
        text,
        text,
        text,
        (repo, serviceId, field, explanation, source) => {
          const url = buildGithubIssueUrl({ repo, serviceId, field, explanation, source });
          if (repo === null) {
            expect(url).toBeNull();
            return;
          }
          expect(url).not.toBeNull();
          const u = new URL(url as string);
          expect(u.origin).toBe("https://github.com");
          expect(u.pathname).toBe(`/${repo}/issues/new`);
          // Parsing the query decodes values; the decoded body must contain the provided data.
          const body = u.searchParams.get("body") ?? "";
          expect(u.searchParams.get("title")).toContain(serviceId.trim());
          expect(body).toContain(serviceId.trim());
          if (field.trim()) expect(body).toContain(field.trim());
          if (explanation.trim()) expect(body).toContain(explanation.trim());
          if (source.trim()) expect(body).toContain(source.trim());
          // The raw query string must be percent-encoded (no spaces leaking through).
          expect(u.search).not.toMatch(/ /);
        },
      ),
      RUNS,
    );
  });

  it("returns null for empty-string repo", () => {
    expect(buildGithubIssueUrl({ repo: "", serviceId: "x" })).toBeNull();
    expect(buildGithubIssueUrl({ repo: "   ", serviceId: "x" })).toBeNull();
  });
});
