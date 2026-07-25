import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MmiCircuit, mmiStations } from "../ucat-drill-trainer.jsx";

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
});
