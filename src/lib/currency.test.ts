import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatCurrencyShort,
  symbolFor,
  MAX_AMOUNT,
} from "@/lib/currency";

// Non-breaking space (U+00A0) and minus glyph (U+2212) used in the output.
const NB = " ";
const MINUS = "−";

describe("formatCurrency", () => {
  it("formats a small value with two decimals and the ZAR symbol", () => {
    expect(formatCurrency(5)).toBe(`R${NB}5.00`);
    expect(formatCurrency(12.5)).toBe(`R${NB}12.50`);
  });

  it("groups thousands with a non-breaking space", () => {
    expect(formatCurrency(12480)).toBe(`R${NB}12${NB}480.00`);
    expect(formatCurrency(1000000)).toBe(`R${NB}1${NB}000${NB}000.00`);
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe(`R${NB}0.00`);
  });

  it("preserves a negative sign with the minus glyph", () => {
    expect(formatCurrency(-2500)).toBe(`${MINUS}R${NB}2${NB}500.00`);
  });

  it("uses the symbol for a known currency code", () => {
    expect(formatCurrency(10, "USD")).toBe(`$${NB}10.00`);
    expect(formatCurrency(10, "EUR")).toBe(`€${NB}10.00`);
  });

  it("falls back to the code itself for an unknown currency", () => {
    expect(formatCurrency(10, "XYZ")).toBe(`XYZ${NB}10.00`);
  });
});

describe("formatCurrencyShort", () => {
  it("stays fully readable below 10 000", () => {
    expect(formatCurrencyShort(9999)).toBe(`R${NB}9${NB}999.00`);
    expect(formatCurrencyShort(500)).toBe(`R${NB}500.00`);
  });

  it("pins the K/M/B/T thresholds", () => {
    expect(formatCurrencyShort(10000)).toBe("R10.0K");
    expect(formatCurrencyShort(12480)).toBe("R12.5K");
    expect(formatCurrencyShort(1_000_000)).toBe("R1.0M");
    expect(formatCurrencyShort(1_500_000_000)).toBe("R1.5B");
    expect(formatCurrencyShort(2_300_000_000_000)).toBe("R2.3T");
  });

  it("preserves the sign across tiers", () => {
    expect(formatCurrencyShort(-50000)).toBe(`${MINUS}R50.0K`);
    expect(formatCurrencyShort(-2_300_000_000_000)).toBe(`${MINUS}R2.3T`);
  });

  it("rolls up at a tier boundary instead of showing 1000.0K", () => {
    expect(formatCurrencyShort(999_950)).toBe("R1.0M");
  });

  it("respects the currency symbol", () => {
    expect(formatCurrencyShort(25000, "USD")).toBe("$25.0K");
  });
});

describe("guards", () => {
  it("clamps values beyond MAX_AMOUNT", () => {
    expect(formatCurrency(MAX_AMOUNT * 2)).toBe(formatCurrency(MAX_AMOUNT));
    expect(formatCurrencyShort(MAX_AMOUNT * 2)).toBe(
      formatCurrencyShort(MAX_AMOUNT),
    );
  });

  it("handles non-finite input without emitting NaN", () => {
    expect(formatCurrency(Infinity)).toBe(`R${NB}0.00`);
    expect(formatCurrency(NaN)).toBe(`R${NB}0.00`);
  });
});

describe("symbolFor", () => {
  it("returns the symbol or the code as a fallback", () => {
    expect(symbolFor("ZAR")).toBe("R");
    expect(symbolFor("JPY")).toBe("JPY");
  });
});
