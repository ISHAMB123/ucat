import { describe, it, expect } from "vitest";
import { generatePlan, currentStreak, DRILL_BY_ID } from "../ucat-drill-trainer.jsx";

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

describe("generatePlan builds a valid dated schedule", () => {
  const start = ymd(new Date(2026, 6, 1));
  const end = ymd(new Date(2026, 7, 12)); // ~6 weeks later

  it("produces sessions, all with real drills and in-range dates", () => {
    const plan = generatePlan({ startYmd: start, endYmd: end, perWeek: 5, focus: ["QR", "VR", "SJT"] });
    expect(plan.length).toBeGreaterThan(10);
    for (const s of plan) {
      expect(DRILL_BY_ID[s.drill], s.drill).toBeTruthy();
      expect(s.date >= start && s.date <= end, s.date).toBe(true);
      expect(typeof s.count).toBe("number");
      expect(s.id).toBeTruthy();
    }
  });

  it("gives every session a unique id", () => {
    const plan = generatePlan({ startYmd: start, endYmd: end, perWeek: 6, focus: ["QR", "VR", "SJT"] });
    expect(new Set(plan.map((s) => s.id)).size).toBe(plan.length);
  });

  it("honours the focus: QR-only plan never schedules VR or SJT drills", () => {
    const plan = generatePlan({ startYmd: start, endYmd: end, perWeek: 5, focus: ["QR"] });
    expect(plan.length).toBeGreaterThan(0);
    for (const s of plan) expect(DRILL_BY_ID[s.drill].section).toBe("QR");
  });

  it("ramps to a taper: the final week is untimed foundations-style, the middle has timed work", () => {
    const plan = generatePlan({ startYmd: start, endYmd: end, perWeek: 6, focus: ["QR", "VR", "SJT"] });
    const lastWeekStart = ymd(addDays(new Date(2026, 7, 12), -6));
    const taper = plan.filter((s) => s.date >= lastWeekStart);
    expect(taper.every((s) => s.note === "Taper")).toBe(true);
    expect(plan.some((s) => s.exam)).toBe(true); // timed sessions appear earlier
  });

  it("returns nothing for an end date on or before the start", () => {
    expect(generatePlan({ startYmd: start, endYmd: start, perWeek: 5, focus: ["QR"] })).toEqual([]);
    expect(generatePlan({ startYmd: end, endYmd: start, perWeek: 5, focus: ["QR"] })).toEqual([]);
  });

  it("fewer days per week yields fewer sessions", () => {
    const few = generatePlan({ startYmd: start, endYmd: end, perWeek: 3, focus: ["QR", "VR", "SJT"] });
    const many = generatePlan({ startYmd: start, endYmd: end, perWeek: 6, focus: ["QR", "VR", "SJT"] });
    expect(many.length).toBeGreaterThan(few.length);
  });
});

describe("currentStreak counts consecutive active days up to today", () => {
  const key = (d) => `history at ${d}`;
  void key;
  it("is zero with no history", () => {
    expect(currentStreak([])).toBe(0);
    expect(currentStreak(undefined)).toBe(0);
  });
  it("counts today and yesterday as a streak of two", () => {
    const now = Date.now();
    const hist = [{ ts: now }, { ts: now - 86400000 }];
    expect(currentStreak(hist)).toBe(2);
  });
  it("a gap breaks the streak", () => {
    const now = Date.now();
    const hist = [{ ts: now }, { ts: now - 3 * 86400000 }];
    expect(currentStreak(hist)).toBe(1);
  });
});
