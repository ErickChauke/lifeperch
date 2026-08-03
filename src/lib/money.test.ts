import { describe, it, expect } from "vitest";
import { todayDay } from "@/lib/money";

describe("todayDay", () => {
  it("stays on the UTC day well before the SAST midnight boundary", () => {
    expect(todayDay(new Date("2026-08-02T12:00:00.000Z"))).toBe("2026-08-02");
  });

  it("has not yet rolled over one minute before SAST midnight (21:59 UTC)", () => {
    expect(todayDay(new Date("2026-08-02T21:59:00.000Z"))).toBe("2026-08-02");
  });

  it("rolls over at SAST midnight (22:00 UTC), two hours before the UTC day changes", () => {
    // This is exactly the case dateToDay(new Date()) got wrong: the UTC day is
    // still 2026-08-02 here, but SAST (UTC+2) has already reached 2026-08-03.
    expect(todayDay(new Date("2026-08-02T22:00:00.000Z"))).toBe("2026-08-03");
  });

  it("stays on the new day well after the boundary", () => {
    expect(todayDay(new Date("2026-08-02T23:30:00.000Z"))).toBe("2026-08-03");
  });
});
