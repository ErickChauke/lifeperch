import Link from "next/link";
import { parseISO } from "date-fns";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { centsToRand } from "@/lib/money";
import { formatCurrencyShort } from "@/lib/currency";
import { summarize, txnsInPeriod } from "@/lib/money-stats";
import type { getTransactions } from "@/actions/money";

type Transaction = Awaited<ReturnType<typeof getTransactions>>[number];

// This month's money at a glance (in, spent, net), linking to Money. Hidden when
// nothing has been logged this month.
export function MoneySnapshot({
  transactions,
  today,
}: {
  transactions: Transaction[];
  today: string;
}) {
  const month = txnsInPeriod(transactions, "month", parseISO(today));
  if (month.length === 0) return null;

  const s = summarize(month);
  const cells = [
    { label: "In", cents: s.income, danger: false },
    { label: "Spent", cents: s.spent, danger: false },
    { label: "Net", cents: s.net, danger: s.net < 0 },
  ];

  return (
    <div className="mt-8 space-y-2">
      <h3 className="text-fg-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
        This month
      </h3>
      <Link
        href="/money"
        className="bg-surface hover:bg-surface-2 flex items-center gap-4 rounded-md border border-border px-4 py-3 transition-colors"
      >
        {cells.map((c) => (
          <div key={c.label} className="min-w-0 flex-1">
            <p className="text-fg-3 font-mono text-[10px] uppercase tracking-[0.08em]">
              {c.label}
            </p>
            <p
              className={cn(
                "truncate font-mono text-lg",
                c.danger ? "text-[var(--danger)]" : "text-fg",
              )}
            >
              {formatCurrencyShort(centsToRand(c.cents))}
            </p>
          </div>
        ))}
        <ArrowRight className="text-fg-4 size-4 shrink-0" strokeWidth={1.75} />
      </Link>
    </div>
  );
}
