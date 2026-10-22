import { afterEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import { clearStates, loadStates, saveState } from "./readinessStore";
import { deriveItems, normalizeRequirement, requirementKey, type ItemState } from "./readiness";
import type { KbEntry } from "./types";

const RUNS = { numRuns: 100 };

// Minimal in-memory localStorage mock.
function makeStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

function installStorage(storage: Storage | null, throwOnAccess = false) {
  const win = throwOnAccess
    ? Object.defineProperty({}, "localStorage", {
        get() {
          throw new Error("localStorage blocked");
        },
        configurable: true,
      })
    : { localStorage: storage };
  vi.stubGlobal("window", win);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function entry(reqs: string[]): KbEntry {
  return {
    id: "svc",
    name_en: "S",
    name_ceb: "",
    locality: "Cebu City",
    who_may_avail: "",
    scope_note: "",
    requirements: reqs,
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
  };
}

const reqText = fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0);
const distinctReqList = fc.uniqueArray(reqText, { minLength: 1, maxLength: 8, selector: (s) => normalizeRequirement(s) });
const stateArb: fc.Arbitrary<ItemState> = fc.constantFrom("HAS", "STILL_NEEDS", "NEEDS_TO_CONFIRM");

describe("readinessStore", () => {
  // Feature: ayasib-andam-na, Property 5: Readiness store round-trip and safe fallback
  it("Property 5: save then load returns the state; malformed/unavailable yields {}", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), reqText, stateArb, (id, text, state) => {
        const storage = makeStorage();
        installStorage(storage);
        const key = requirementKey(text);
        saveState(id, key, state);
        expect(loadStates(id)[key]).toBe(state);

        // Malformed JSON -> {}
        storage.setItem("ayasib.readiness.v1", "{not json");
        expect(loadStates(id)).toEqual({});

        // Unavailable storage (access throws) -> {}
        installStorage(null, true);
        expect(loadStates(id)).toEqual({});
      }),
      RUNS,
    );
  });

  // Feature: ayasib-andam-na, Property 6: Persistence survives reorder, add, and remove by stable identity
  it("Property 6: states follow requirement text across reorder/add/remove", () => {
    fc.assert(
      fc.property(distinctReqList, (reqs) => {
        const storage = makeStorage();
        installStorage(storage);
        const id = "svc";
        // Assign each requirement HAS.
        reqs.forEach((r) => saveState(id, requirementKey(r), "HAS"));

        // Reorder: reverse the list — every surviving requirement keeps HAS.
        const reordered = [...reqs].reverse();
        const afterReorder = deriveItems(entry(reordered), loadStates(id));
        afterReorder.forEach((item) => expect(item.state).toBe("HAS"));

        // Add a brand-new requirement -> defaults STILL_NEEDS.
        const added = "\u0001brand-new-requirement\u0001";
        const withAdded = deriveItems(entry([...reqs, added]), loadStates(id));
        const addedItem = withAdded.find((i) => i.text === added);
        expect(addedItem?.state).toBe("STILL_NEEDS");

        // Remove the first requirement -> remaining keep HAS, removed one's state affects nobody.
        const removed = reqs.slice(1);
        const afterRemove = deriveItems(entry(removed), loadStates(id));
        afterRemove.forEach((item) => expect(item.state).toBe("HAS"));
      }),
      RUNS,
    );
  });

  // Feature: ayasib-andam-na, Property 7: No cross-transfer of saved state between requirements
  it("Property 7: distinct normalized text never shares resolved state", () => {
    fc.assert(
      fc.property(
        reqText,
        reqText,
        stateArb,
        (a, b, state) => {
          fc.pre(normalizeRequirement(a) !== normalizeRequirement(b));
          const storage = makeStorage();
          installStorage(storage);
          const id = "svc";
          saveState(id, requirementKey(a), state);
          // b was never saved: it resolves to default, not a's state (unless a's state is the default).
          const items = deriveItems(entry([b]), loadStates(id));
          expect(items[0].key).not.toBe(requirementKey(a));
          expect(items[0].state).toBe("STILL_NEEDS");
        },
      ),
      RUNS,
    );
  });

  // Feature: ayasib-andam-na, Property 8: Distinct items within an entry never share a stored-state key
  it("Property 8: distinct normalized requirements get distinct keys", () => {
    fc.assert(
      fc.property(distinctReqList, (reqs) => {
        const keys = reqs.map((r) => requirementKey(r));
        expect(new Set(keys).size).toBe(keys.length);
      }),
      RUNS,
    );
  });

  // Feature: ayasib-frontend-redesign — Start over
  it("clearStates removes only the target id and is safe when storage is unavailable", () => {
    const storage = makeStorage();
    installStorage(storage);
    saveState("svc-a", requirementKey("Valid ID"), "HAS");
    saveState("svc-b", requirementKey("Other"), "NEEDS_TO_CONFIRM");
    clearStates("svc-a");
    expect(loadStates("svc-a")).toEqual({});
    expect(loadStates("svc-b")[requirementKey("Other")]).toBe("NEEDS_TO_CONFIRM");

    // Unavailable storage: no throw.
    installStorage(null, true);
    expect(() => clearStates("svc-a")).not.toThrow();
  });
});
