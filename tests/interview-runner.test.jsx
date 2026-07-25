import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ivTopics, IV_TOPIC_ORDER, buildInterviewCircuit, scoreAnswer, InterviewLauncher } from "../ucat-drill-trainer.jsx";

describe("buildInterviewCircuit", () => {
  it("MMI mode tests every topic, one question each", () => {
    const c = buildInterviewCircuit("mmi", "med", [], null);
    expect(c.length).toBe(4);
    expect(c.map((q) => q.topic).sort()).toEqual([...IV_TOPIC_ORDER].sort());
    for (const q of c) { expect(q.mmi).toBe(true); expect(q.prompt).toBeTruthy(); expect(q.covers.length).toBe(4); }
  });
  it("Panel mode draws four questions from the pool", () => {
    const pool = Array.from({ length: 10 }, (_, i) => ({ q: `Question ${i}?`, g: "guide", theme: "Motivation" }));
    const c = buildInterviewCircuit("panel", "med", pool, null);
    expect(c.length).toBe(4);
    expect(c.every((q) => q.mmi === false)).toBe(true);
  });
  it("every MMI topic exposes a framework, rubric and prompts", () => {
    const T = ivTopics("dent");
    for (const k of IV_TOPIC_ORDER) {
      expect(T[k].framework.length).toBeGreaterThan(0);
      expect(T[k].covers.length).toBe(4);
      expect(T[k].prompts.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("scoreAnswer", () => {
  it("scores an MMI answer against its station rubric", () => {
    const ethics = buildInterviewCircuit("mmi", "med", [], null).find((q) => q.topic === "ethics");
    const strong = "This is a clash of confidentiality and patient safety. My concern is the risk of harm to patients. I would speak to my friend with compassion, without judging, to understand why, and encourage them to seek help from occupational health, escalating to a tutor if patient safety remained at risk.";
    const r = scoreAnswer(strong, ethics);
    expect(r.out10).toBeGreaterThanOrEqual(6);
    expect(Array.isArray(r.met)).toBe(true);
  });
  it("scores a panel answer with the general marker", () => {
    const q = { id: "p", topic: "panel", type: "Motivation", prompt: "Why medicine?", guide: "", mmi: false };
    const r = scoreAnswer("During work experience I saw how hard the hours were but was still drawn to it, which taught me the reality and confirmed my choice.", q);
    expect(typeof r.out10).toBe("number");
    expect(r.met).toBe(null);
  });
});

describe("InterviewLauncher", () => {
  it("shows the source and the MMI/Panel toggle on the general bank", () => {
    render(<InterviewLauncher track="med" />);
    expect(screen.getByText(/Question source/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /MMI circuit/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Panel questions/i })).toBeTruthy();
  });
  it("launches the fullscreen circuit with a Go button", () => {
    render(<InterviewLauncher track="med" />);
    fireEvent.click(screen.getByRole("button", { name: /Start the circuit/i }));
    expect(screen.getByText(/Station 1 \/ 4/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Go$/i })).toBeTruthy();
  });
});
