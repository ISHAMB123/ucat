import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlannerPanel } from "../ucat-drill-trainer.jsx";

/* PlannerPanel is the most stateful view in the app. These smoke tests
   mount it, drive the main flows and assert it never throws and that
   generating a plan actually writes sessions back through setPrefs. */
function setup(prefs = {}) {
  const calls = { setPrefs: [], planDone: [] };
  const setPrefs = vi.fn((p) => calls.setPrefs.push(p));
  const setPlanDone = vi.fn((k, v) => calls.planDone.push([k, v]));
  const onStart = vi.fn();
  render(
    <PlannerPanel
      unlocked={true}
      plan={{}}
      onStart={onStart}
      prefs={{ customPlan: [], ...prefs }}
      setPrefs={setPrefs}
      setPlanDone={setPlanDone}
      best={{}}
      history={[]}
    />
  );
  return { calls, setPrefs, setPlanDone, onStart };
}

describe("PlannerPanel", () => {
  it("mounts and shows the test-date prompt when no date is set", () => {
    expect(() => setup()).not.toThrow();
    expect(screen.getByText(/When do you sit the UCAT/i)).toBeTruthy();
  });

  it("shows the stat tiles", () => {
    setup();
    expect(screen.getByText(/day streak/i)).toBeTruthy();
    expect(screen.getByText(/complete/i)).toBeTruthy();
  });

  it("generates a plan and writes sessions through setPrefs", () => {
    const { setPrefs } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Auto-build plan/i }));
    fireEvent.click(screen.getByRole("button", { name: /Balanced/i }));
    expect(setPrefs).toHaveBeenCalled();
    const last = setPrefs.mock.calls.at(-1)[0];
    expect(Array.isArray(last.customPlan)).toBe(true);
    expect(last.customPlan.length).toBeGreaterThan(5);
  });

  it("adds a single custom session through the add form", () => {
    const { setPrefs } = setup();
    /* With no sessions the add form is already open. */
    fireEvent.click(screen.getByRole("button", { name: /Add to plan/i }));
    const last = setPrefs.mock.calls.at(-1)[0];
    expect(last.customPlan.length).toBe(1);
  });

  it("renders an existing session with a Start control", () => {
    setup({ customPlan: [{ id: "x1", drill: "estimate", exam: false, count: 10, date: null, note: "" }] });
    expect(screen.getByRole("button", { name: /^Start$/i })).toBeTruthy();
  });

  it("toggling a session done calls setPlanDone with its key", () => {
    const { setPlanDone } = setup({ customPlan: [{ id: "x1", drill: "estimate", exam: false, count: 10, date: null, note: "" }] });
    fireEvent.click(screen.getByRole("button", { name: /Mark done/i }));
    expect(setPlanDone).toHaveBeenCalledWith("cust:x1", true);
  });
});
