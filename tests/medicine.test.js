import { describe, it, expect } from "vitest";
import { MED_SCHOOLS } from "../data/medicine.js";
import { assessMed } from "../ucat-drill-trainer.jsx";

const STATUSES = ["strong", "range", "aspire", "out", "block"];

describe("medicine dataset and assessment", () => {
  it("every school has the fields the selector needs", () => {
    for (const u of MED_SCHOOLS) {
      expect(u.id && u.name && u.col, u.name).toBeTruthy();
      expect(["scored", "threshold", "none"]).toContain(u.gcse);
      expect(["scored", "threshold", "notused", "achieved"]).toContain(u.pred);
      expect(typeof u.ucatW).toBe("string");
    }
  });

  it("assessMed returns a valid status for any profile and never throws", () => {
    const profiles = [
      { ucat: 2600, band: 1, pred: "A*AA", g9: 9, g8: 0, g7: 0, ctx: false },
      { ucat: 1500, band: 4, pred: "Other", g9: 0, g8: 0, g7: 2, ctx: true },
      { ucat: 2000, band: 2, pred: "AAA", g9: 3, g8: 3, g7: 2, ctx: false },
    ];
    for (const f of profiles) for (const u of MED_SCHOOLS) {
      const r = assessMed(u, f);
      expect(STATUSES, `${u.name}`).toContain(r.status);
      expect(r.reasons.length).toBeGreaterThan(0);
    }
  });

  it("schools that ignore predicted grades never fault a low prediction", () => {
    const lowPred = { ucat: 2200, band: 2, pred: "Other", g9: 8, g8: 0, g7: 0, ctx: false };
    for (const u of MED_SCHOOLS.filter((x) => x.pred === "notused")) {
      const r = assessMed(u, lowPred);
      expect(r.reasons.join(" ")).toMatch(/not used/i);
    }
  });
});
