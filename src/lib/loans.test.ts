import { describe, it, expect } from "vitest";
import { loanOutstanding, loanUnused, loanOverdrawn } from "@/lib/loans";

describe("loanOutstanding", () => {
  it("returns what is still owed", () => {
    expect(loanOutstanding({ principal: 100000, repaid: 40000 })).toBe(60000);
  });

  it("floors at zero once repaid", () => {
    expect(loanOutstanding({ principal: 100000, repaid: 100000 })).toBe(0);
    expect(loanOutstanding({ principal: 100000, repaid: 150000 })).toBe(0);
  });
});

describe("loanUnused", () => {
  it("returns what is left of the principal to use", () => {
    expect(loanUnused({ principal: 100000, used: 0 })).toBe(100000);
    expect(loanUnused({ principal: 100000, used: 40000 })).toBe(60000);
  });

  it("floors at zero once fully used", () => {
    expect(loanUnused({ principal: 100000, used: 100000 })).toBe(0);
    expect(loanUnused({ principal: 100000, used: 150000 })).toBe(0);
  });
});

describe("loanOverdrawn", () => {
  it("is zero while within the principal", () => {
    expect(loanOverdrawn({ principal: 100000, used: 0 })).toBe(0);
    expect(loanOverdrawn({ principal: 100000, used: 100000 })).toBe(0);
  });

  it("returns the excess once past the principal", () => {
    expect(loanOverdrawn({ principal: 100000, used: 130000 })).toBe(30000);
  });
});
