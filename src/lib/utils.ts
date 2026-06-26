import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatCurrency } from "@/lib/currency"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Returns a ZAR string like "R 12 480.00". Thin wrapper over formatCurrency so
// the many existing call sites keep working; new code can call formatCurrency or
// formatCurrencyShort directly. The amount is in rand, not cents.
export function formatZAR(amount: number): string {
  return formatCurrency(amount, "ZAR")
}
