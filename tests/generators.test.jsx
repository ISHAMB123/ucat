import { describe, it, expect } from "vitest";
import {
  LEVELS,
  makeTables, makeCalc, makeEstimate, makeQrSets, makeScan,
  makeTfc, makeSjt, makeDm, makeVenn, makeProb, makeLogic,
  buildVrMock, buildQrMock,
} from "../ucat-drill-trainer.jsx";

/* Every generated question's stated answer must resolve to a real
   selectable option. The encoding differs by question kind, so this
   mirrors exactly how the app decides correctness:
     - ranking (order):   order is a permutation of the option indices
     - syllogism set:     each conclusion carries a boolean answer
     - typed (no options): the answer is a non-empty string
     - index answers (q.a, or a numeric answer on a scale question):
                          the index points at a real option
     - value answers:     the option list contains the answer verbatim   */
function checkQuestion(q, label) {
  const where = `${label}: ${q.stem || q.prompt || "(no stem)"}`;

  if (q.order) {
    expect(Array.isArray(q.options), where).toBe(true);
    const indices = [...q.order].sort((a, b) => a - b);
    expect(indices, where).toEqual([...q.options.keys()]);
    return;
  }

  if (q.statements) {
    expect(q.statements.length, where).toBeGreaterThan(0);
    for (const s of q.statements) expect(typeof s.yes, where).toBe("boolean");
    return;
  }

  if (!q.options) {
    expect(q.answer == null ? "" : String(q.answer), where).not.toBe("");
    return;
  }

  expect(q.options.length, where).toBeGreaterThan(0);

  if (q.a !== undefined) {
    expect(Number.isInteger(q.a), where).toBe(true);
    expect(q.a >= 0 && q.a < q.options.length, where).toBe(true);
  } else if (typeof q.answer === "number" && q.kind === "scale") {
    expect(q.answer >= 0 && q.answer < q.options.length, where).toBe(true);
  } else {
    expect(q.options, where).toContain(q.answer);
  }
}

const LVLS = Object.keys(LEVELS);
const REPS = 40; /* each call already emits many questions; repeat for RNG spread */

describe("generators produce answers that exist in their options", () => {
  it("makeTables", () => {
    for (const lvl of LVLS) for (let i = 0; i < REPS; i++)
      makeTables(12, {}, lvl).forEach((q) => checkQuestion(q, "makeTables"));
  });

  it("makeCalc", () => {
    for (const lvl of LVLS) for (let i = 0; i < REPS; i++)
      makeCalc(12, {}, lvl).forEach((q) => checkQuestion(q, "makeCalc"));
  });

  it("makeScan", () => {
    for (let i = 0; i < REPS; i++)
      makeScan(12, {}).forEach((q) => checkQuestion(q, "makeScan"));
  });

  it("makeTfc", () => {
    for (let i = 0; i < REPS; i++)
      makeTfc(12, {}).forEach((q) => checkQuestion(q, "makeTfc"));
  });

  it("makeEstimate (every family)", () => {
    const subs = ["mixed", "ratio", "graph", "rate", "pct", "infer", "unit"];
    for (const lvl of LVLS) for (const sub of subs) for (let i = 0; i < REPS; i++)
      makeEstimate(10, {}, lvl, sub).forEach((q) => checkQuestion(q, `makeEstimate:${sub}`));
  });

  it("makeQrSets", () => {
    for (const lvl of LVLS) for (let i = 0; i < REPS; i++)
      makeQrSets(12, lvl).forEach((q) => checkQuestion(q, "makeQrSets"));
  });

  it("makeVenn (all seven shapes)", () => {
    for (const lvl of LVLS) for (let i = 0; i < REPS * 4; i++)
      makeVenn(7, lvl).forEach((q) => checkQuestion(q, "makeVenn"));
  });

  it("makeProb (every level)", () => {
    for (const lvl of LVLS) for (let i = 0; i < REPS * 2; i++) {
      const qs = makeProb(12, {}, lvl);
      expect(qs.length).toBe(12);
      qs.forEach((q) => {
        checkQuestion(q, "makeProb");
        expect(q.options.length, q.stem).toBe(4);
      });
    }
  });

  it("makeLogic (verified single-solution puzzles)", () => {
    for (const lvl of LVLS) for (let i = 0; i < REPS * 2; i++) {
      const qs = makeLogic(12, {}, lvl);
      expect(qs.length).toBe(12);
      qs.forEach((q) => {
        checkQuestion(q, "makeLogic");
        expect(q.options, q.stem).toContain(q.answer);
      });
    }
  });

  it("makeSjt and makeTfc serve the least-seen content first", () => {
    /* Discover every scenario/passage id, then mark all but one as heavily
       seen and confirm the generator serves the untouched one first. */
    const allSids = [...new Set(makeSjt(999, {}, "all", {}).map((q) => q.sid))];
    expect(allSids.length).toBeGreaterThan(1);
    const targetS = allSids[allSids.length - 1];
    const seenS = {};
    allSids.forEach((id) => { if (id !== targetS) seenS["sjt:" + id] = 9; });
    makeSjt(1, {}, "all", seenS).forEach((q) => expect(q.sid).toBe(targetS));

    const allPids = [...new Set(makeTfc(999, {}, {}).map((q) => q.pid))];
    expect(allPids.length).toBeGreaterThan(1);
    const targetP = allPids[allPids.length - 1];
    const seenP = {};
    allPids.forEach((id) => { if (id !== targetP) seenP["vr:" + id] = 9; });
    makeTfc(1, {}, seenP).forEach((q) => expect(q.pid).toBe(targetP));
  });

  it("makeDm (every sub)", () => {
    const subs = ["mixed", "dsyll", "dvenn", "dprob", "dlogic"];
    for (const lvl of LVLS) for (const sub of subs) for (let i = 0; i < REPS; i++)
      makeDm(12, {}, sub, lvl).forEach((q) => checkQuestion(q, `makeDm:${sub}`));
  });

  it("makeDm never returns an empty bank", () => {
    /* An empty array would pass the answer-in-options check vacuously, so
       assert a real bank for every sub, including null and an unrecognised
       value like the drill's own "dm" tag, which must not filter to nothing. */
    for (const sub of ["mixed", "dsyll", "dvenn", "dprob", "dlogic", null, undefined, "dm"])
      for (const lvl of LVLS)
        expect(makeDm(10, {}, sub, lvl).length, `empty for sub ${sub}`).toBeGreaterThan(0);
  });

  it("makeSjt (every format)", () => {
    for (let i = 0; i < REPS; i++)
      makeSjt(25, {}, "all").forEach((q) => checkQuestion(q, "makeSjt"));
  });

  it("buildVrMock", () => {
    for (let week = 1; week < 30; week++) for (let slot = 0; slot < 3; slot++)
      buildVrMock(week, slot).flat.forEach((q) => checkQuestion(q, "buildVrMock"));
  });

  it("buildQrMock", () => {
    for (let week = 1; week < 30; week++) for (let slot = 0; slot < 3; slot++)
      buildQrMock(week, slot).flat.forEach((q) => checkQuestion(q, "buildQrMock"));
  });

  it("mini mocks (VR, QR)", () => {
    for (let week = 1; week < 30; week++) for (let slot = 0; slot < 5; slot++) {
      buildVrMock(week, slot, true).flat.forEach((q) => checkQuestion(q, "vrMini"));
      buildQrMock(week, slot, true).flat.forEach((q) => checkQuestion(q, "qrMini"));
    }
  });
});
