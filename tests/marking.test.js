import { describe, it, expect } from "vitest";
import { markAnswer } from "../engine/marking.js";

/* The interview marker must always return a sane out-of-10 score and a
   best/worst range that brackets it, for any input. */
const SAMPLES = [
  "",
  "I want to be a dentist.",
  "During my placement last year I noticed a patient was anxious, so I explained each step slowly and checked they understood. It taught me that clear communication calms people, and I have used that since when tutoring.",
  "we did a project and it was good and we worked as a team and it was rewarding and helped people",
];

describe("markAnswer returns a coherent out-of-10 score", () => {
  for (const text of SAMPLES) {
    it(`scores: "${text.slice(0, 30)}"`, () => {
      const r = markAnswer(text);
      expect(r.crits.length).toBe(5);
      for (const key of ["outOf10", "best10", "worst10"]) {
        expect(Number.isInteger(r[key]), key).toBe(true);
        expect(r[key] >= 1 && r[key] <= 10, `${key}=${r[key]}`).toBe(true);
      }
      expect(r.worst10 <= r.outOf10, "worst <= score").toBe(true);
      expect(r.best10 >= r.outOf10, "best >= score").toBe(true);
      expect(typeof r.bestCase).toBe("string");
      expect(typeof r.worstCase).toBe("string");
    });
  }
});

import { analyseDelivery } from "../engine/marking.js";

describe("analyseDelivery reads spoken pace, fillers and length", () => {
  it("returns null without speech or a duration", () => {
    expect(analyseDelivery("", 30)).toBe(null);
    expect(analyseDelivery("some words here", 0)).toBe(null);
  });
  it("computes words per minute from words and seconds", () => {
    const text = Array.from({ length: 120 }, () => "word").join(" ");
    const d = analyseDelivery(text, 60);
    expect(d.wpm).toBe(120);
    expect(d.paceTone).toBe("good");
  });
  it("flags a fast pace", () => {
    const text = Array.from({ length: 200 }, () => "word").join(" ");
    expect(analyseDelivery(text, 60).paceTone).toBe("fast");
  });
  it("counts filler words", () => {
    const d = analyseDelivery("um so basically like i mean the thing um", 20);
    expect(d.fillers).toBeGreaterThanOrEqual(4);
    expect(d.verdict).toMatch(/filler/i);
  });
  it("breaks fillers down by word and groups variants", () => {
    const d = analyseDelivery("um umm ummm like like basically", 20);
    expect(d.fillerCounts.um).toBe(3);
    expect(d.fillerCounts.like).toBe(2);
    expect(d.fillerCounts.basically).toBe(1);
    expect(d.fillers).toBe(6);
  });
});

import { fillerAdvice } from "../engine/marking.js";

describe("fillerAdvice", () => {
  it("returns null when there are no fillers", () => {
    expect(fillerAdvice({}, 0)).toBe(null);
  });
  it("gives ordered tips naming the worst offender", () => {
    const tips = fillerAdvice({ um: 4, like: 1 }, 5);
    expect(Array.isArray(tips)).toBe(true);
    expect(tips.length).toBeGreaterThanOrEqual(3);
    expect(tips.some((t) => t.includes("um"))).toBe(true);
  });
});
