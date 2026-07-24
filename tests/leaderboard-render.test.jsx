import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockLeaderboard } from "../ucat-drill-trainer.jsx";

const mk = (n) => Array.from({ length: n }, (_, i) => ({ name: `P${i + 1}`, pct: 100 - i, ts: i + 1 }));

describe("MockLeaderboard", () => {
  it("shows an empty state when there are no entries", () => {
    render(<MockLeaderboard entries={[]} you={null} boardGlobal={false} />);
    expect(screen.getByText(/No scores yet this week/i)).toBeTruthy();
  });

  it("renders the board with entries and does not throw", () => {
    expect(() => render(<MockLeaderboard entries={mk(5)} you={null} boardGlobal={true} />)).not.toThrow();
    expect(screen.getByText(/This week's board/i)).toBeTruthy();
    expect(screen.getAllByText("P1").length).toBeGreaterThan(0);
  });

  it("shows a your-standing panel with rank and percentile when you are on the board", () => {
    const entries = mk(10);
    render(<MockLeaderboard entries={entries} you={{ name: "P3", pct: 98 }} boardGlobal={true} />);
    expect(screen.getByText("#3")).toBeTruthy();
    expect(screen.getByText(/Top 30% this week/i)).toBeTruthy();
  });

  it("crowns the leader with the top-of-the-board message", () => {
    render(<MockLeaderboard entries={mk(8)} you={{ name: "P1", pct: 100 }} boardGlobal={true} />);
    expect(screen.getByText(/Top of the board/i)).toBeTruthy();
  });

  it("pins your row when you place outside the visible top 12", () => {
    const entries = mk(20);
    render(<MockLeaderboard entries={entries} you={{ name: "P18", pct: 83 }} boardGlobal={true} />);
    // P18 is rank 18, beyond the top 12 list, but still shown via the pinned row
    expect(screen.getByText("P18")).toBeTruthy();
    expect(screen.getByText("#18")).toBeTruthy();
  });
});
