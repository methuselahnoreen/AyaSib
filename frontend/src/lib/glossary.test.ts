import { describe, expect, it } from "vitest";
import { findGlossaryTerms, termsUsed } from "./glossary";
import { buildTranslatePrompt, isLang } from "./translate";

const g = [
  { en: "business permit", ceb: "permiso sa negosyo" },
  { en: "permit", ceb: "permiso" },
  { en: "affidavit", fil: "sinumpaang salaysay", ceb: "affidavit" },
];

describe("glossary", () => {
  it("finds terms in the source language and lists longer terms first", () => {
    const found = findGlossaryTerms("Please get a Business Permit", "en", "ceb", g);
    expect(found.map((f) => f.source)).toEqual(["business permit", "permit"]);
  });
  it("skips terms with no rendering in the target language", () => {
    expect(findGlossaryTerms("business permit", "en", "fil", g)).toEqual([]);
  });
  it("reports only terms that actually appear in the translation", () => {
    const terms = [
      { source: "business permit", target: "permiso sa negosyo" },
      { source: "affidavit", target: "affidavit" },
    ];
    expect(termsUsed(terms, "Kuhaa ang imong Permiso sa Negosyo.")).toEqual([terms[0]]);
  });
});

describe("translate helpers", () => {
  it("validates language codes", () => {
    expect(isLang("ceb")).toBe(true);
    expect(isLang("tl")).toBe(false);
  });
  it("puts required glossary renderings in the prompt", () => {
    const { user } = buildTranslatePrompt("business permit", "en", "ceb", [{ source: "business permit", target: "permiso sa negosyo" }]);
    expect(user).toContain('"business permit" -> "permiso sa negosyo"');
  });
});
