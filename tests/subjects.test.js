import { describe, it, expect } from "vitest";
import { predFromSubjects, evalSubjReq, subjPresetFor, SUBJ_PRESETS, MED_SUBJ, DENT_SUBJ } from "../ucat-drill-trainer.jsx";
import { MED_SCHOOLS } from "../data/medicine.js";
import { UNIS } from "../data/universities.js";

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
  it("chemonly needs only Chemistry, no second science", () => {
    expect(evalSubjReq(S(["Chemistry", "A"], ["History", "A"], ["English", "A"]), "chemonly").ok).toBe(true);
    expect(evalSubjReq(S(["Biology", "A"], ["History", "A"], ["English", "A"]), "chemonly").ok).toBe(false);
  });
  it("cbonly needs only one of Chemistry or Biology", () => {
    expect(evalSubjReq(S(["Biology", "A"], ["History", "A"], ["English", "A"]), "cbonly").ok).toBe(true);
    expect(evalSubjReq(S(["Physics", "A"], ["History", "A"], ["English", "A"]), "cbonly").ok).toBe(false);
  });
  it("any passes every combination (graduate entry)", () => {
    expect(evalSubjReq(S(["History", "A"], ["English", "A"], ["Art", "A"]), "any").ok).toBe(true);
  });
  it("General Studies never counts toward a requirement", () => {
    expect(evalSubjReq(S(["Chemistry", "A"], ["General Studies", "A"], ["History", "A"]), "chem1").ok).toBe(false);
    expect(evalSubjReq(S(["Chemistry", "A"], ["Biology", "A"], ["General Studies", "A"]), "chembio").ok).toBe(true);
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
    expect(subjPresetFor("med", "imperial")).toBe("chembio");
    expect(subjPresetFor("med", "uea")).toBe("bio1");
    expect(subjPresetFor("med", "plymouth")).toBe("bio1");
    expect(subjPresetFor("med", "sheffield")).toBe("cb1psy");
    expect(subjPresetFor("med", "newcastle")).toBe("chemonly");
    expect(subjPresetFor("med", "buckingham")).toBe("cbonly");
    expect(subjPresetFor("med", "surrey")).toBe("any");
  });
  it("dentistry Bristol and Plymouth deviate from Chem+Bio", () => {
    expect(subjPresetFor("dent", "bristol")).toBe("chem1");
    expect(subjPresetFor("dent", "plymouth")).toBe("bio1");
  });
  it("every school resolves to a preset that exists", () => {
    for (const u of MED_SCHOOLS) expect(SUBJ_PRESETS[subjPresetFor("med", u.id)], u.id).toBeTruthy();
    for (const u of UNIS.filter((x) => !x.id.startsWith("a_") && !x.id.startsWith("am_"))) {
      expect(SUBJ_PRESETS[subjPresetFor("dent", u.id)], u.id).toBeTruthy();
    }
  });
  it("no override points at a school id that does not exist (typo guard)", () => {
    const medIds = new Set(MED_SCHOOLS.map((u) => u.id));
    for (const id of Object.keys(MED_SUBJ)) expect(medIds.has(id), `MED_SUBJ.${id}`).toBe(true);
    const dentIds = new Set(UNIS.map((u) => u.id));
    for (const id of Object.keys(DENT_SUBJ)) expect(dentIds.has(id), `DENT_SUBJ.${id}`).toBe(true);
  });
  it("every override value is a defined preset", () => {
    for (const key of [...Object.values(MED_SUBJ), ...Object.values(DENT_SUBJ)]) {
      expect(SUBJ_PRESETS[key], key).toBeTruthy();
    }
  });
});
