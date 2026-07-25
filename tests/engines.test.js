import { describe, it, expect } from "vitest";
import { analysePace, paceState, projectScore, readinessScore, schoolsInRange } from "../ucat-drill-trainer.jsx";
import { MED_SCHOOLS } from "../data/medicine.js";
import { UNIS } from "../data/universities.js";

const day = 86400000;

describe("analysePace splits errors by tempo", () => {
  it("returns null with too little timed data", () => {
    expect(analysePace([{ ms: 1000, correct: true }])).toBe(null);
    expect(analysePace([])).toBe(null);
  });
  it("flags rushed errors when wrong answers came fast", () => {
    const log = [
      { ms: 10000, correct: true, score: 1 },
      { ms: 10000, correct: true, score: 1 },
      { ms: 10000, correct: true, score: 1 },
      { ms: 1000, correct: false, score: 0 },
      { ms: 1000, correct: false, score: 0 },
    ];
    const r = analysePace(log);
    expect(r.rushed).toBe(2);
    expect(r.laboured).toBe(0);
    expect(r.verdict).toMatch(/sped up/i);
  });
  it("flags laboured errors when wrong answers came slow", () => {
    const log = [
      { ms: 2000, correct: true, score: 1 },
      { ms: 2000, correct: true, score: 1 },
      { ms: 2000, correct: true, score: 1 },
      { ms: 9000, correct: false, score: 0 },
      { ms: 9000, correct: false, score: 0 },
    ];
    const r = analysePace(log);
    expect(r.laboured).toBe(2);
    expect(r.rushed).toBe(0);
  });
});

describe("paceState compares position to the clock", () => {
  it("is on pace when position matches time", () => {
    expect(paceState(18, 660, 1320, 36).tone).toBe("on"); // halfway through, 18/36
  });
  it("is behind when position lags time", () => {
    const p = paceState(6, 660, 1320, 36);
    expect(p.tone).toBe("behind");
    expect(p.behindBy).toBeGreaterThan(0);
  });
  it("is ahead when position leads time", () => {
    expect(paceState(30, 660, 1320, 36).tone).toBe("ahead");
  });
  it("returns null with no clock", () => {
    expect(paceState(5, 10, 0, 36)).toBe(null);
  });
});

describe("projectScore extends a trend to test day", () => {
  const now = 1_700_000_000_000;
  it("returns null with no mock history", () => {
    expect(projectScore([], null)).toBe(null);
    expect(projectScore(undefined, null)).toBe(null);
  });
  it("projects a rising VR trend upward", () => {
    const mh = [
      { t: "vr", pct: 50, ts: now - 14 * day },
      { t: "vr", pct: 60, ts: now - 7 * day },
      { t: "vr", pct: 70, ts: now },
    ];
    const p = projectScore(mh, null, now);
    expect(p.vr.proj).toBeGreaterThanOrEqual(p.vr.now);
    expect(p.complete).toBe(false); // no QR yet, so no /2700 total
    expect(p.total).toBe(null);
  });
  it("produces a bounded /2700 band once both sections exist", () => {
    const mh = [
      { t: "vr", pct: 60, ts: now - 7 * day }, { t: "vr", pct: 70, ts: now },
      { t: "qr", pct: 55, ts: now - 7 * day }, { t: "qr", pct: 65, ts: now },
    ];
    const p = projectScore(mh, null, now);
    expect(p.complete).toBe(true);
    expect(p.total.lo).toBeLessThan(p.total.proj);
    expect(p.total.hi).toBeGreaterThan(p.total.proj);
    expect(p.total.proj).toBeGreaterThanOrEqual(900);
    expect(p.total.proj).toBeLessThanOrEqual(2700);
  });
});

describe("readinessScore blends the right signals", () => {
  it("is low for an untouched account", () => {
    const r = readinessScore({ best: {}, history: [], plan: {}, customPlan: [], examDate: null });
    expect(r.score).toBeLessThan(20);
    expect(r.band).toBe("Early days");
    expect(r.factors.length).toBe(4);
  });
  it("rises with scores, coverage and activity", () => {
    const now = Date.now();
    const r = readinessScore({
      best: { tfc: { pct: 80 }, estimate: { pct: 78 }, sjt: { pct: 82 } },
      history: [{ ts: now }, { ts: now - day }, { ts: now - 2 * day }],
      plan: {}, customPlan: [], examDate: null,
    });
    expect(r.score).toBeGreaterThan(40);
  });
});

describe("schoolsInRange counts schools cleared", () => {
  it("counts more schools as the score rises (medicine)", () => {
    const low = schoolsInRange(1600, "med", MED_SCHOOLS, UNIS);
    const high = schoolsInRange(2400, "med", MED_SCHOOLS, UNIS);
    expect(high.inRange).toBeGreaterThanOrEqual(low.inRange);
    expect(high.total).toBeGreaterThan(0);
  });
  it("works for dentistry and returns null without a score", () => {
    expect(schoolsInRange(2000, "dent", MED_SCHOOLS, UNIS).total).toBeGreaterThan(0);
    expect(schoolsInRange(null, "dent", MED_SCHOOLS, UNIS)).toBe(null);
  });
});
