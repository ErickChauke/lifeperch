import { describe, it, expect } from "vitest";
import { monthsToGoal, formatEta } from "@/lib/goals";

describe("monthsToGoal", () => {
  it("returns fractional months at the contribution rate", () => {
    expect(monthsToGoal(0, 100000, 10000)).toBe(10);
    expect(monthsToGoal(0, 100000, 40000)).toBe(2.5);
  });

  it("returns 0 once the target is reached", () => {
    expect(monthsToGoal(100000, 100000, 10000)).toBe(0);
    expect(monthsToGoal(150000, 100000, 10000)).toBe(0);
  });

  it("returns null without a target or monthly amount", () => {
    expect(monthsToGoal(0, 0, 10000)).toBeNull();
    expect(monthsToGoal(0, 100000, 0)).toBeNull();
  });
});

describe("formatEta", () => {
  it("shows years with one decimal from 12 months", () => {
    expect(formatEta(24)).toBe("2 years");
    expect(formatEta(28)).toBe("2.3 years");
    expect(formatEta(30)).toBe("2.5 years");
    expect(formatEta(12)).toBe("1 year");
    expect(formatEta(11.7)).toBe("1 year");
  });

  it("shows whole months under a year", () => {
    expect(formatEta(5)).toBe("5 months");
    expect(formatEta(1.2)).toBe("2 months");
    expect(formatEta(1)).toBe("1 month");
    expect(formatEta(11.2)).toBe("12 months");
  });

  it("shows weeks under a month", () => {
    expect(formatEta(0.5)).toBe("2 weeks");
    expect(formatEta(0.8)).toBe("3 weeks");
    expect(formatEta(0.25)).toBe("1 week");
  });

  it("shows days under a week", () => {
    expect(formatEta(0.23)).toBe("7 days");
    expect(formatEta(0.1)).toBe("4 days");
    expect(formatEta(0.03)).toBe("1 day");
    expect(formatEta(0.001)).toBe("1 day");
  });
});
