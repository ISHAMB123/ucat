import { describe, it, expect } from "vitest";
import { marksToScale, old3600to2700 } from "../ucat-drill-trainer.jsx";

describe("marksToScale estimates a 300-900 scaled score", () => {
  it("floors at 300 and caps at 900", () => {
    expect(marksToScale(0, 44)).toBe(300);
    expect(marksToScale(44, 44)).toBe(900);
    expect(marksToScale(50, 44)).toBe(900); // over-max clamps
  });
  it("rises monotonically with more marks", () => {
    let prev = -1;
    for (let m = 0; m <= 36; m += 4) {
      const s = marksToScale(m, 36);
      expect(s).toBeGreaterThanOrEqual(prev);
      expect(s).toBeGreaterThanOrEqual(300);
      expect(s).toBeLessThanOrEqual(900);
      prev = s;
    }
  });
  it("a mid score lands in the mid range", () => {
    const s = marksToScale(22, 44);
    expect(s).toBeGreaterThan(540);
    expect(s).toBeLessThan(660);
  });
  it("returns null for a zero or missing max", () => {
    expect(marksToScale(10, 0)).toBe(null);
    expect(marksToScale(10, null)).toBe(null);
  });
  it("rounds to a multiple of ten", () => {
    for (let m = 0; m <= 44; m++) expect(marksToScale(m, 44) % 10).toBe(0);
  });
});

describe("old3600to2700 rescales a four-subtest total", () => {
  it("maps the range endpoints exactly", () => {
    expect(old3600to2700(3600)).toBe(2700);
    expect(old3600to2700(1200)).toBe(900);
  });
  it("scales a mid total by three quarters", () => {
    expect(old3600to2700(2400)).toBe(1800);
  });
  it("clamps out-of-range and rejects junk", () => {
    expect(old3600to2700(5000)).toBe(2700);
    expect(old3600to2700(0)).toBe(null);
    expect(old3600to2700("")).toBe(null);
    expect(old3600to2700("abc")).toBe(null);
  });
});
