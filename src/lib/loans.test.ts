import { describe, it, expect } from "vitest";
import { loanOutstanding, loanUnspent, loanOverspent } from "@/lib/loans";

describe("loanOutstanding", () => {
  it("returns what is still owed", () => {
    expect(loanOutstanding({ principal: 100000, repaid: 40000 })).toBe(60000);
  });

  it("floors at zero once repaid", () => {
    expect(loanOutstanding({ principal: 100000, repaid: 100000 })).toBe(0);
    expect(loanOutstanding({ principal: 100000, repaid: 150000 })).toBe(0);
  });
});

describe("loanUnspent", () => {
  it("returns what is left of the principal to spend", () => {
    expect(loanUnspent({ principal: 100000, spent: 0 })).toBe(100000);
    expect(loanUnspent({ principal: 100000, spent: 40000 })).toBe(60000);
  });

  it("floors at zero once fully spent", () => {
    expect(loanUnspent({ principal: 100000, spent: 100000 })).toBe(0);
    expect(loanUnspent({ principal: 100000, spent: 150000 })).toBe(0);
  });
});

describe("loanOverspent", () => {
  it("is zero while within the principal", () => {
    expect(loanOverspent({ principal: 100000, spent: 0 })).toBe(0);
    expect(loanOverspent({ principal: 100000, spent: 100000 })).toBe(0);
  });

  it("returns the excess once past the principal", () => {
    expect(loanOverspent({ principal: 100000, spent: 130000 })).toBe(30000);
  });
});
