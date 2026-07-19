// Single source of truth for money formatting. Amounts are in major units (rand
// for ZAR), matching the formatZAR(centsToRand(...)) convention used at the
// display boundary. Functions are pure so they can be unit tested in isolation.

// NB is a non-breaking space (U+00A0) so a grouped amount never wraps mid-number
// on a narrow screen. MINUS is the typographic minus glyph (U+2212), kept for
// visual parity with the original formatZAR output.
const NB = " ";
const MINUS = "−";

// Symbol per ISO 4217 code. Unknown codes fall back to the code itself.
export const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: "R",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

// Returns the symbol for a currency code, or the code itself as a safe fallback.
export function symbolFor(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
}

// Largest amount safe to handle as a plain number. Money is stored as integer
// cents, so cents must stay below Number.MAX_SAFE_INTEGER (~9e15). That caps the
// major-unit value at ~9e13 (about 90 trillion), comfortably past the trillions
// this app needs to display. Beyond this, switch the column to BigInt/decimal.
export const MAX_AMOUNT = Math.floor(Number.MAX_SAFE_INTEGER / 100);

// Ceiling for amounts stored in Int columns: cents must fit a signed 32-bit
// integer. Goal amounts are BigInt-backed and use MAX_AMOUNT instead.
export const MAX_DB_AMOUNT = Math.floor(2147483647 / 100);

// Groups the integer part with non-breaking-space thousands separators.
function group(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, NB);
}

// Clamps a possibly out-of-range or non-finite amount into the safe band so the
// formatters never emit "NaN" or lose precision past MAX_AMOUNT.
function guard(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  if (amount > MAX_AMOUNT) return MAX_AMOUNT;
  if (amount < -MAX_AMOUNT) return -MAX_AMOUNT;
  return amount;
}

// Full value with two decimals and the correct symbol, e.g. "R 12 480.00".
// Negative amounts carry a leading minus glyph. Pair with the mono face for
// tabular alignment.
export function formatCurrency(amount: number, currencyCode = "ZAR"): string {
  const value = guard(amount);
  const negative = value < 0;
  const [whole, decimals] = Math.abs(value).toFixed(2).split(".");
  const symbol = symbolFor(currencyCode);
  return `${negative ? MINUS : ""}${symbol}${NB}${group(whole)}.${decimals}`;
}

// min is the value at which the suffix kicks in; div is the divisor for that
// suffix. K starts at 10 000 but still divides by 1 000, so 12 480 reads 12.5K.
const TIERS = [
  { min: 1e12, div: 1e12, suffix: "T" },
  { min: 1e9, div: 1e9, suffix: "B" },
  { min: 1e6, div: 1e6, suffix: "M" },
  { min: 1e4, div: 1e3, suffix: "K" },
] as const;

// Compact value with one decimal and a K/M/B/T suffix, e.g. "R12.5K". Only
// abbreviates at >= 10 000 so smaller values stay fully readable (falls back to
// the full format). The sign is preserved. Hand-rolled tiers keep the suffix
// uppercase and the symbol consistent across currencies.
export function formatCurrencyShort(amount: number, currencyCode = "ZAR"): string {
  const value = guard(amount);
  const abs = Math.abs(value);
  if (abs < 1e4) return formatCurrency(value, currencyCode);

  const symbol = symbolFor(currencyCode);
  const sign = value < 0 ? MINUS : "";

  for (let i = 0; i < TIERS.length; i++) {
    const tier = TIERS[i];
    if (abs < tier.min) continue;
    let scaled = abs / tier.div;
    let suffix = tier.suffix;
    // Rounding can push a value over the next tier (e.g. 999 950 -> 1000.0K).
    // Each higher suffix is 1 000x, so roll up so it reads 1.0M instead.
    if (Number(scaled.toFixed(1)) >= 1000 && suffix !== "T") {
      scaled /= 1000;
      suffix = TIERS[i - 1].suffix;
    }
    return `${sign}${symbol}${scaled.toFixed(1)}${suffix}`;
  }

  // Unreachable (abs >= 1e4 always matches the K tier), kept for type safety.
  return formatCurrency(value, currencyCode);
}
