import { describe, it, expect } from "vitest";
import { scoreEntry, snapAnswered } from "../ucat-drill-trainer.jsx";

/* The free-navigation banks mark every question at the end from a saved
   answer snapshot, rather than as each answer is given. This checks that
   the end-of-section scoring matches the live rules: right/wrong for
   multiple choice, partial for one-away Situational Judgement and for
   syllogism sets, and a skipped (no snapshot) question scoring zero. */

describe("snapshot scoring matches the live marking rules", () => {
  const mcq = { kind: "mcq", options: ["3/28", "9/64", "3/8", "1/4"], answer: "3/28" };
  const scale = { kind: "scale", options: ["A", "B", "C", "D"], answer: 1 };
  const syll = { kind: "syllset", statements: [{ yes: true }, { yes: false }, { yes: true }] };
  const rank = { kind: "rank", order: [2, 0, 1] };

  it("marks a correct multiple-choice answer", () => {
    expect(scoreEntry(mcq, { picked: 0 }, 0).correct).toBe(true);
    expect(scoreEntry(mcq, { picked: 2 }, 0).correct).toBe(false);
  });

  it("gives a skipped question zero and no crash", () => {
    for (const q of [mcq, scale, syll, rank]) {
      const e = scoreEntry(q, undefined, 0);
      expect(e.correct).toBe(false);
      expect(e.score).toBe(0);
    }
  });

  it("awards partial marks one step away on the appropriateness scale", () => {
    expect(scoreEntry(scale, { picked: 1 }, 0).score).toBe(1);
    expect(scoreEntry(scale, { picked: 2 }, 0).score).toBe(0.5);
    expect(scoreEntry(scale, { picked: 3 }, 0).score).toBe(0);
  });

  it("scores a syllogism set proportionally", () => {
    expect(scoreEntry(syll, { syllPicks: [1, 0, 1] }, 0).score).toBe(1);
    expect(scoreEntry(syll, { syllPicks: [1, 1, 1] }, 0).score).toBeCloseTo(2 / 3, 5);
  });

  it("marks a ranking only when the full order matches", () => {
    expect(scoreEntry(rank, { rankPicks: [2, 0, 1] }, 0).correct).toBe(true);
    expect(scoreEntry(rank, { rankPicks: [0, 1, 2] }, 0).correct).toBe(false);
  });

  it("detects whether a snapshot is a complete answer", () => {
    expect(snapAnswered(mcq, { picked: 0 })).toBe(true);
    expect(snapAnswered(mcq, { picked: null })).toBe(false);
    expect(snapAnswered(mcq, undefined)).toBe(false);
    expect(snapAnswered(syll, { syllPicks: [1, 0, 1] })).toBe(true);
    expect(snapAnswered(syll, { syllPicks: [1, 0] })).toBe(false);
    expect(snapAnswered(rank, { rankPicks: [2, 0, 1] })).toBe(true);
  });
});
