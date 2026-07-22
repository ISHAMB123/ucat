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
