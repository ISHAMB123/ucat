import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MmiCircuit, mmiStations, scoreStation } from "../ucat-drill-trainer.jsx";

describe("scoreStation marks against the station's own key points", () => {
  const ethics = mmiStations("med").find((s) => s.id === "ethics");
  it("credits an answer that hits the station's criteria", () => {
    const strong = "This is a clash between confidentiality and patient safety. My first concern is the risk of harm to patients if my friend is impaired. I would speak to my friend with compassion, without judging, to understand why they are struggling and support them. I would encourage them to self-refer to occupational health, and escalate to a tutor if patient safety remained at risk.";
    const r = scoreStation(strong, ethics);
    expect(r.covered).toBeGreaterThanOrEqual(3);
    expect(r.out10).toBeGreaterThanOrEqual(6);
    expect(r.met.length).toBe(4);
  });
  it("marks a vague answer down and flags missed points", () => {
    const weak = "I would probably just tell someone about it because it is the right thing to do and drinking is bad for everyone involved really.";
    const r = scoreStation(weak, ethics);
    expect(r.covered).toBeLessThan(ethics.covers.length);
    expect(r.met.some((m) => !m.met)).toBe(true);
  });
});

describe("mmiStations", () => {
  it("returns a circuit of typed stations with frameworks", () => {
    const s = mmiStations("med");
    expect(s.length).toBeGreaterThanOrEqual(5);
    for (const st of s) {
      expect(st.type && st.label && st.prompt).toBeTruthy();
      expect(Array.isArray(st.framework) && st.framework.length).toBeTruthy();
      expect(Array.isArray(st.covers) && st.covers.length).toBeTruthy();
    }
    expect(s.some((st) => st.type === "Ethics")).toBe(true);
  });
  it("adapts wording to the track", () => {
    expect(mmiStations("med")[0].prompt).toMatch(/medicine/i);
    expect(mmiStations("dent")[0].prompt).toMatch(/dentistry/i);
  });
});

describe("MmiCircuit", () => {
  it("mounts and shows the first station open, others collapsed", () => {
    expect(() => render(<MmiCircuit track="med" />)).not.toThrow();
    // first station (motivation) prompt is visible
    expect(screen.getByText(/Why do you want to study medicine/i)).toBeTruthy();
  });

  it("expands a collapsed station on click", () => {
    render(<MmiCircuit track="med" />);
    const ethicsHeader = screen.getByRole("button", { name: /An ethical dilemma/i });
    fireEvent.click(ethicsHeader);
    expect(screen.getByText(/drinking heavily before placement/i)).toBeTruthy();
    // the four pillars framework is shown
    expect(screen.getByText(/^Autonomy$/)).toBeTruthy();
  });

  it("marks a typed answer when Mark it is pressed", () => {
    render(<MmiCircuit track="med" />);
    // first station (motivation) is open by default
    const box = screen.getAllByPlaceholderText(/Speak it or type it/i)[0];
    fireEvent.change(box, { target: { value: "During my work experience on a ward I saw how hard the long hours were, but I was still drawn to the problem solving and the patients, which is why I still chose medicine." } });
    fireEvent.click(screen.getByRole("button", { name: /^Mark it$/i }));
    // a score and the answer-focused checklist appear
    expect(screen.getByText(/key points/i)).toBeTruthy();
    expect(screen.getByText(/Did your answer hit/i)).toBeTruthy();
  });
});
