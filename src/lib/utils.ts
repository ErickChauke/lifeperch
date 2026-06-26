import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Returns a ZAR string like "R 12 480.00": leading R, thousands separator, two
// decimals. The separators are non-breaking spaces so an amount never wraps
// mid-number on a narrow screen. Negative amounts carry a leading minus. Pair
// with the mono face for tabular alignment. The amount is in rand, not cents.
// NB is a non-breaking space (U+00A0) so the grouped amount stays on one line.
const NB = " "
export function formatZAR(amount: number): string {
  const negative = amount < 0
  const [whole, decimals] = Math.abs(amount).toFixed(2).split(".")
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NB)
  return `${negative ? "−" : ""}R${NB}${grouped}.${decimals}`
}
