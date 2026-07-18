import Link from "next/link";
import { HandCoins, ArrowRight } from "lucide-react";
import { formatCurrency, formatCurrencyShort } from "@/lib/currency";
import { centsToRand } from "@/lib/money";
import { formatEta } from "@/lib/goals";

// Warning-tinted alert shown while any self-loan is outstanding, linking to
// the loans tab. Renders nothing when there is no debt.
export function DebtBanner({
  debtCents,
  monthlyCents,
}: {
  debtCents: number;
  monthlyCents: number;
}) {
  if (debtCents <= 0) return null;
  const eta = monthlyCents > 0 ? debtCents / monthlyCents : null;
  return (
    <Link
      href="/money/loans"
      className="flex items-center gap-3 rounded-lg border border-[color-mix(in_oklch,var(--warning)_35%,transparent)] bg-[color-mix(in_oklch,var(--warning)_10%,transparent)] px-4 py-3 transition-colors hover:bg-[color-mix(in_oklch,var(--warning)_16%,transparent)]"
    >
      <HandCoins className="size-4 shrink-0 text-[var(--warning)]" strokeWidth={1.75} />
      <span className="text-fg min-w-0 flex-1 text-sm">
        You owe yourself{" "}
        <span
          className="font-mono font-medium text-[var(--warning)]"
          title={formatCurrency(centsToRand(debtCents))}
        >
          {formatCurrencyShort(centsToRand(debtCents))}
        </span>
        {eta !== null ? (
          <span className="text-fg-2">
            {" "}
            · ≈ {formatEta(eta)} at {formatCurrencyShort(centsToRand(monthlyCents))}/mo
          </span>
        ) : (
          <span className="text-fg-2"> · no repayment plan yet</span>
        )}
      </span>
      <ArrowRight className="text-fg-4 size-4 shrink-0" strokeWidth={1.75} />
    </Link>
  );
}
