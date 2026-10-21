import { describe, expect, it } from "vitest";
import { TtlCache } from "./cache";

describe("TtlCache", () => {
  it("returns stored values until they expire", () => {
    const c = new TtlCache<string>(1000, 10);
    c.set("a", "x", 0);
    expect(c.get("a", 500)).toBe("x");
    expect(c.get("a", 1000)).toBeUndefined();
  });
  it("evicts the oldest entry when full", () => {
    const c = new TtlCache<number>(1000, 2);
    c.set("a", 1, 0);
    c.set("b", 2, 0);
    c.set("c", 3, 0);
    expect(c.get("a", 1)).toBeUndefined();
    expect(c.get("b", 1)).toBe(2);
    expect(c.get("c", 1)).toBe(3);
  });
});
