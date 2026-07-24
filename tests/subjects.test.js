import { describe, it, expect } from "vitest";
import { predFromSubjects, evalSubjReq, subjPresetFor, SUBJ_PRESETS } from "../ucat-drill-trainer.jsx";

const S = (...pairs) => pairs.map(([subj, grade]) => ({ subj, grade }));

describe("predFromSubjects collapses subjects to a grade string", () => {
  it("reads the best three grades", () => {
    expect(predFromSubjects(S(["Chemistry", "A*"], ["Biology", "A"], ["Maths", "A"]))).toBe("A*AA");
    expect(predFromSubjects(S(["Chemistry", "A"], ["Biology", "A"], ["Maths", "A"]))).toBe("AAA");
    expect(predFromSubjects(S(["Chemistry", "A"], ["Biology", "A"], ["Maths", "B"]))).toBe("AAB");
    expect(predFromSubjects(S(["Chemistry", "B"], ["Biology", "B"], ["Maths", "B"]))).toBe("Other");
  });
});

describe("evalSubjReq honours each school's real pattern", () => {
  it("chembio needs both Chemistry and Biology", () => {
    expect(evalSubjReq(S(["Chemistry", "A"], ["Biology", "A"], ["Maths", "A"]), "chembio").ok).toBe(true);
    expect(evalSubjReq(S(["Chemistry", "A"], ["Physics", "A"], ["Maths", "A"]), "chembio").ok).toBe(false);
  });
  it("chem1 needs Chemistry plus a second science, not Psychology", () => {
    expect(evalSubjReq(S(["Chemistry", "A"], ["Physics", "A"], ["History", "A"]), "chem1").ok).toBe(true);
    expect(evalSubjReq(S(["Chemistry", "A"], ["Psychology", "A"], ["History", "A"]), "chem1").ok).toBe(false);
    expect(evalSubjReq(S(["Biology", "A"], ["Physics", "A"], ["History", "A"]), "chem1").ok).toBe(false);
  });
  it("chem1psy accepts Psychology as the second science", () => {
    expect(evalSubjReq(S(["Chemistry", "A"], ["Psychology", "A"], ["History", "A"]), "chem1psy").ok).toBe(true);
  });
  it("bio1 needs Biology, with Chemistry optional", () => {
    expect(evalSubjReq(S(["Biology", "A"], ["Physics", "A"], ["History", "A"]), "bio1").ok).toBe(true);
    expect(evalSubjReq(S(["Chemistry", "A"], ["Physics", "A"], ["History", "A"]), "bio1").ok).toBe(false);
  });
  it("cb1 accepts either science plus a second", () => {
    expect(evalSubjReq(S(["Biology", "A"], ["Physics", "A"], ["History", "A"]), "cb1").ok).toBe(true);
    expect(evalSubjReq(S(["Chemistry", "A"], ["Maths", "A"], ["History", "A"]), "cb1").ok).toBe(true);
    expect(evalSubjReq(S(["Biology", "A"], ["History", "A"], ["English", "A"]), "cb1").ok).toBe(false);
  });
  it("General Studies never counts toward a requirement", () => {
    expect(evalSubjReq(S(["Chemistry", "A"], ["General Studies", "A"], ["History", "A"]), "chem1").ok).toBe(false);
  });
});

describe("subjPresetFor routes schools to the right pattern", () => {
  it("dentistry defaults to both sciences, with known exceptions", () => {
    expect(subjPresetFor("dent", "birmingham")).toBe("chembio");
    expect(subjPresetFor("dent", "qmul")).toBe("cb1");
    expect(subjPresetFor("dent", "kcl")).toBe("cb1psy");
  });
  it("medicine defaults to Chemistry plus a second science, with known exceptions", () => {
    expect(subjPresetFor("med", "aberdeen")).toBe("chem1");
    expect(subjPresetFor("med", "ucl")).toBe("chembio");
    expect(subjPresetFor("med", "uea")).toBe("bio1");
    expect(subjPresetFor("med", "sheffield")).toBe("cb1psy");
  });
  it("every preset key referenced actually exists", () => {
    for (const key of ["chembio", "chem1", "chem1psy", "bio1", "cb1", "cb1psy"]) {
      expect(SUBJ_PRESETS[key]).toBeTruthy();
      expect(typeof SUBJ_PRESETS[key].label).toBe("string");
    }
  });
});
