import { describe, it, expect } from "vitest";
import { MOCK_BANK, mockPassage } from "../ucat-drill-trainer.jsx";

/* Every VR mock highlights the sentence a question's answer came from.
   The review screen finds that evidence with passage.text.indexOf and
   silently renders nothing when it is missing, so a typo in either the
   evidence or the passage would strip the highlight without any error.
   This asserts every evidence string appears verbatim in its passage. */
describe("mock evidence appears verbatim in its passage", () => {
  it("checks every evidence string against its passage", () => {
    let checked = 0;
    for (const set of MOCK_BANK) {
      const passage = mockPassage(set.pid);
      expect(passage, `missing passage for pid ${set.pid}`).toBeTruthy();
      for (const q of set.questions) {
        if (!q.evidence) continue;
        checked++;
        expect(
          passage.text.includes(q.evidence),
          `evidence not found in passage "${set.pid}": "${q.evidence}"`
        ).toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
