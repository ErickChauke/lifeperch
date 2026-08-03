import { describe, it, expect } from "vitest";
import { computeWeeklyStreak } from "@/lib/habits";

// Weeks run Monday..Sunday. 2026-08-03 is a Monday, so the week in progress
// below is 2026-08-03 (Mon) .. 2026-08-09 (Sun), and 2026-07-27 / 2026-07-20
// are the two prior Mondays.
describe("computeWeeklyStreak", () => {
  it("does not count an in-progress week yet, but keeps the streak alive while it is still reachable", () => {
    const metDays = new Set([
      "2026-08-03", // this week, 1 of 3 so far - still reachable, not counted yet
      "2026-07-27",
      "2026-07-29",
      "2026-07-31", // prior week, hit target
      "2026-07-20",
      "2026-07-22",
      "2026-07-24", // week before that, also hit target
    ]);
    expect(computeWeeklyStreak(metDays, "2026-08-05", 3)).toBe(2);
  });

  it("counts the current week immediately once it has already hit target", () => {
    const metDays = new Set([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05", // this week, target already hit
      "2026-07-27",
      "2026-07-29",
      "2026-07-31",
      "2026-07-20",
      "2026-07-22",
      "2026-07-24",
    ]);
    expect(computeWeeklyStreak(metDays, "2026-08-05", 3)).toBe(3);
  });

  it("breaks immediately once the current week can no longer reach target", () => {
    // Sunday, last day of the week, nothing logged: 0 met + 0 days left < 3.
    const metDays = new Set(["2026-07-27", "2026-07-29", "2026-07-31"]);
    expect(computeWeeklyStreak(metDays, "2026-08-09", 3)).toBe(0);
  });

  it("stops at the first past week that fell short of target", () => {
    const metDays = new Set([
      "2026-08-03", // this week, still reachable, not counted
      "2026-07-27",
      "2026-07-29",
      "2026-07-31", // prior week, hit target - counts
      "2026-07-20", // week before that, only 1 of 3 - streak stops here
    ]);
    expect(computeWeeklyStreak(metDays, "2026-08-05", 3)).toBe(1);
  });
});
