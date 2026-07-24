import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScoreConverter } from "../ucat-drill-trainer.jsx";

describe("ScoreConverter keeps marks within the paper maximum", () => {
  it("caps a too-high marks entry at the maximum", () => {
    render(<ScoreConverter />);
    const vr = screen.getByLabelText(/Verbal Reasoning marks/i);
    fireEvent.change(vr, { target: { value: "99" } });
    expect(vr.value).toBe("44");
  });

  it("lowering the out-of pulls an over-limit mark down with it", () => {
    render(<ScoreConverter />);
    const vrMarks = screen.getByLabelText(/Verbal Reasoning marks/i);
    const vrOut = screen.getByLabelText(/Verbal Reasoning out of/i);
    fireEvent.change(vrMarks, { target: { value: "40" } });
    fireEvent.change(vrOut, { target: { value: "30" } });
    expect(vrMarks.value).toBe("30");
  });

  it("allows an empty marks box and normal in-range values", () => {
    render(<ScoreConverter />);
    const qr = screen.getByLabelText(/Quantitative Reasoning marks/i);
    fireEvent.change(qr, { target: { value: "20" } });
    expect(qr.value).toBe("20");
    fireEvent.change(qr, { target: { value: "" } });
    expect(qr.value).toBe("");
  });
});
