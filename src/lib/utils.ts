import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Returns a ZAR string like "R 12 480.00": leading R, space thousands separator,
// two decimals. Negative amounts carry a leading minus. Pair with the mono face
// for tabular alignment. The amount is in rand (major units), not cents.
export function formatZAR(amount: number): string {
  const negative = amount < 0
  const [whole, decimals] = Math.abs(amount).toFixed(2).split(".")
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  return `${negative ? "−" : ""}R ${grouped}.${decimals}`
}
