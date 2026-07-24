import { describe, it, expect } from "vitest";
import { dedupeBest } from "../ucat-drill-trainer.jsx";

describe("dedupeBest keeps one best row per name, ranked", () => {
  it("keeps each name's highest score", () => {
    const out = dedupeBest([
      { name: "Sam", pct: 60, ts: 1 },
      { name: "Sam", pct: 82, ts: 2 },
      { name: "Jo", pct: 75, ts: 3 },
    ]);
    expect(out.map((e) => [e.name, e.pct])).toEqual([["Sam", 82], ["Jo", 75]]);
  });

  it("sorts high to low and breaks ties by earliest timestamp", () => {
    const out = dedupeBest([
      { name: "A", pct: 70, ts: 20 },
      { name: "B", pct: 70, ts: 10 },
    ]);
    expect(out.map((e) => e.name)).toEqual(["B", "A"]);
  });

  it("drops malformed rows so one bad entry cannot break the board", () => {
    const out = dedupeBest([
      { name: "Ok", pct: 50, ts: 1 },
      { name: "NoPct", ts: 2 },
      null,
      { pct: 90, ts: 3 },
      { name: "Bad", pct: "x", ts: 4 },
    ]);
    expect(out.map((e) => e.name)).toEqual(["Ok"]);
  });

  it("returns an empty array for empty or missing input", () => {
    expect(dedupeBest([])).toEqual([]);
    expect(dedupeBest(undefined)).toEqual([]);
  });
});
