import { describe, it, expect } from "vitest";
import { PASSAGES, TFC_SETS } from "../data/vr.js";
import { SJT_SCENARIOS } from "../data/sjt.js";
import { DM_QUESTIONS, SYLL_SETS } from "../data/dm.js";

/* The static content banks carry hand-written and generated questions. The
   app trusts every answer index to point at a real option and every id to be
   unique; a bad index would silently mark a correct answer wrong, and a
   duplicate id would collide in the review screens. Nothing enforced that
   until now, so this asserts the self-consistency contract the generator
   prompt promises is checked. */

function assertUnique(ids, label) {
  const seen = new Set();
  for (const id of ids) {
    if (id == null) continue; // id is optional on some entries
    expect(seen.has(id), `duplicate ${label} id: "${id}"`).toBe(false);
    seen.add(id);
  }
}

describe("static content banks are self-consistent", () => {
  it("every DM_QUESTIONS answer points at a real option", () => {
    expect(DM_QUESTIONS.length).toBeGreaterThan(0);
    for (const q of DM_QUESTIONS) {
      if (q.tag === "dvenn") continue; // options computed from venn data
      expect(Array.isArray(q.options), `no options: "${q.stem}"`).toBe(true);
      expect(
        Number.isInteger(q.a) && q.a >= 0 && q.a < q.options.length,
        `answer index ${q.a} out of range for "${q.stem}"`
      ).toBe(true);
    }
  });

  it("every SYLL_SETS conclusion has a boolean answer and unique ids", () => {
    expect(SYLL_SETS.length).toBeGreaterThan(0);
    assertUnique(SYLL_SETS.map((s) => s.id), "SYLL_SETS");
    for (const set of SYLL_SETS) {
      expect(set.statements.length, `too few statements in "${set.id}"`).toBeGreaterThanOrEqual(3);
      for (const st of set.statements) {
        expect(typeof st.yes, `non-boolean yes in "${set.id}"`).toBe("boolean");
      }
    }
  });

  it("every PASSAGES comprehension answer is a real option and ids are unique", () => {
    expect(PASSAGES.length).toBeGreaterThan(0);
    assertUnique(PASSAGES.map((p) => p.id), "PASSAGES");
    for (const p of PASSAGES) {
      for (const c of p.comprehension || []) {
        expect(
          Number.isInteger(c.correct) && c.correct >= 0 && c.correct < c.options.length,
          `comprehension correct ${c.correct} out of range in "${p.id}"`
        ).toBe(true);
      }
    }
  });

  it("every TFC_SETS statement keys a real passage and scores 0-2", () => {
    const passageIds = new Set(PASSAGES.map((p) => p.id));
    for (const key of Object.keys(TFC_SETS)) {
      expect(passageIds.has(key), `TFC_SETS key "${key}" has no passage`).toBe(true);
      for (const st of TFC_SETS[key]) {
        expect(
          Number.isInteger(st.a) && st.a >= 0 && st.a <= 2,
          `TFC answer ${st.a} out of range in "${key}"`
        ).toBe(true);
      }
    }
  });

  it("every SJT answer, ranking and id is valid", () => {
    expect(SJT_SCENARIOS.length).toBeGreaterThan(0);
    assertUnique(SJT_SCENARIOS.map((s) => s.id), "SJT_SCENARIOS");
    for (const sc of SJT_SCENARIOS) {
      for (const item of sc.items || []) {
        expect(
          Number.isInteger(item.answer) && item.answer >= 0 && item.answer <= 3,
          `SJT answer ${item.answer} out of range in "${sc.id}"`
        ).toBe(true);
      }
      if (sc.ranking) {
        const { options, order } = sc.ranking;
        const sorted = [...order].sort((x, y) => x - y);
        expect(
          sorted.join(",") === options.map((_, i) => i).join(","),
          `ranking order in "${sc.id}" is not a permutation of its options`
        ).toBe(true);
      }
    }
  });
});
