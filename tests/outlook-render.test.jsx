import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OutlookPanel } from "../ucat-drill-trainer.jsx";

const day = 86400000;

describe("OutlookPanel", () => {
  it("mounts with an empty account and prompts for a mock", () => {
    expect(() => render(<OutlookPanel best={{}} history={[]} plan={{}} prefs={{}} onGoto={() => {}} />)).not.toThrow();
    expect(screen.getByText(/Your outlook/i)).toBeTruthy();
    expect(screen.getByText(/No projection yet/i)).toBeTruthy();
  });

  it("shows a projected band and readiness once there is data", () => {
    const now = Date.now();
    const prefs = {
      track: "med",
      examDate: null,
      mockHist: [
        { t: "vr", pct: 60, ts: now - 7 * day }, { t: "vr", pct: 70, ts: now },
        { t: "qr", pct: 55, ts: now - 7 * day }, { t: "qr", pct: 66, ts: now },
      ],
    };
    render(<OutlookPanel best={{ tfc: { pct: 72 } }} history={[{ ts: now }]} plan={{}} prefs={prefs} onGoto={() => {}} />);
    expect(screen.getByText(/Projected by test day/i)).toBeTruthy();
    expect(screen.getByText(/\/ 2700 estimate/i)).toBeTruthy();
    expect(screen.getByText(/medical schools/i)).toBeTruthy();
  });
});
