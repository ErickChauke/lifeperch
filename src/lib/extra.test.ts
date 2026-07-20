import { describe, it, expect } from "vitest";
import { addDays } from "date-fns";
import { extraMonthly, monthsToClear, extraLabel } from "@/lib/extra";

const NONE = { extraAmount: 0, extraFrequency: null, extraDate: null };
const TODAY = new Date(2026, 6, 20);

describe("extraMonthly", () => {
  it("is zero without an extra", () => {
    expect(extraMonthly(NONE)).toBe(0);
    expect(extraMonthly({ ...NONE, extraAmount: 5000 })).toBe(0);
  });

  it("puts a repeating extra on the monthly scale", () => {
    expect(extraMonthly({ ...NONE, extraAmount: 5000, extraFrequency: "month" })).toBe(5000);
    // 52 weeks over 12 months, 365 days over 12 months.
    expect(extraMonthly({ ...NONE, extraAmount: 5000, extraFrequency: "week" })).toBe(21667);
    expect(extraMonthly({ ...NONE, extraAmount: 5000, extraFrequency: "day" })).toBe(152083);
  });

  it("is zero for a one-off, which lands as a lump instead", () => {
    expect(
      extraMonthly({ extraAmount: 200000, extraFrequency: "once", extraDate: TODAY }),
    ).toBe(0);
  });
});

describe("monthsToClear", () => {
  it("returns 0 when there is nothing left", () => {
    expect(monthsToClear(0, 50000, NONE, TODAY)).toBe(0);
  });

  it("divides by the monthly rate without an extra", () => {
    expect(monthsToClear(600000, 50000, NONE, TODAY)).toBe(12);
  });

  it("returns null when nothing is going in", () => {
    expect(monthsToClear(600000, 0, NONE, TODAY)).toBeNull();
  });

  it("adds a repeating extra to the rate", () => {
    const plan = { extraAmount: 50000, extraFrequency: "month", extraDate: null };
    expect(monthsToClear(600000, 50000, plan, TODAY)).toBe(6);
  });

  it("clears on a one-off alone when the rate is zero", () => {
    const plan = {
      extraAmount: 600000,
      extraFrequency: "once",
      extraDate: addDays(TODAY, 30),
    };
    expect(monthsToClear(600000, 0, plan, TODAY)).toBeCloseTo(30 / (365 / 12), 5);
  });

  it("never clears when a one-off is too small and nothing else goes in", () => {
    const plan = {
      extraAmount: 10000,
      extraFrequency: "once",
      extraDate: addDays(TODAY, 30),
    };
    expect(monthsToClear(600000, 0, plan, TODAY)).toBeNull();
  });

  it("ignores a one-off that lands after the debt is already cleared", () => {
    const plan = {
      extraAmount: 500000,
      extraFrequency: "once",
      extraDate: addDays(TODAY, 365),
    };
    expect(monthsToClear(100000, 50000, plan, TODAY)).toBe(2);
  });

  it("shortens the run when a one-off lands mid-way", () => {
    // 12 months at the plain rate. Once the lump lands before payoff it simply
    // comes off the total, so the run is (600000 - 400000) / 50000 = 4 months.
    const plan = {
      extraAmount: 400000,
      extraFrequency: "once",
      extraDate: addDays(TODAY, 90),
    };
    expect(monthsToClear(600000, 50000, plan, TODAY)).toBeCloseTo(4, 5);
  });

  it("finishes on the day a big enough one-off lands", () => {
    const plan = {
      extraAmount: 590000,
      extraFrequency: "once",
      extraDate: addDays(TODAY, 90),
    };
    expect(monthsToClear(600000, 50000, plan, TODAY)).toBeCloseTo(90 / (365 / 12), 5);
  });

  it("treats a past one-off as landing now", () => {
    const plan = {
      extraAmount: 300000,
      extraFrequency: "once",
      extraDate: addDays(TODAY, -60),
    };
    expect(monthsToClear(600000, 50000, plan, TODAY)).toBe(6);
  });
});

describe("extraLabel", () => {
  const money = (cents: number) => `R${cents / 100}`;

  it("is null without an extra", () => {
    expect(extraLabel(NONE, money)).toBeNull();
  });

  it("describes each cadence", () => {
    expect(extraLabel({ ...NONE, extraAmount: 5000, extraFrequency: "day" }, money)).toBe(
      "R50 daily",
    );
    expect(extraLabel({ ...NONE, extraAmount: 20000, extraFrequency: "week" }, money)).toBe(
      "R200 weekly",
    );
    expect(
      extraLabel({ extraAmount: 100000, extraFrequency: "once", extraDate: TODAY }, money),
    ).toBe("R1000 once");
  });
});
