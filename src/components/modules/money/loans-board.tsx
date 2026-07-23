"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatZAR } from "@/lib/utils";
import { format } from "date-fns";
import { formatCurrency, formatCurrencyShort, MAX_DB_AMOUNT } from "@/lib/currency";
import { centsToRand, stripNegative } from "@/lib/money";
import { formatEta, etaTargetDate } from "@/lib/goals";
import { loanOutstanding, loanUnused, loanOverdrawn } from "@/lib/loans";
import { monthsToClear, extraMonthly, extraLabel } from "@/lib/extra";
import { repayLoan, type getLoans } from "@/actions/loans";
import { MoneyEmpty } from "./money-empty";
import { LoanModal } from "./loan-modal";
import type { Goal } from "./goals-board";

export type Loan = Awaited<ReturnType<typeof getLoans>>[number];

export function LoansBoard({ loans, goals }: { loans: Loan[]; goals: Goal[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [repaying, setRepaying] = useState<Loan | null>(null);

  const open = loans.filter((l) => !l.settledAt);
  const settled = loans.filter((l) => l.settledAt);
  const debt = open.reduce((sum, l) => sum + loanOutstanding(l), 0);
  // Repeating extras count toward the rate; a one-off lands on its own date and
  // only shows on that loan's card.
  const monthly = open.reduce((sum, l) => sum + l.monthlyAmount + extraMonthly(l), 0);
  const unused = open.reduce((sum, l) => sum + loanUnused(l), 0);
  const eta = monthly > 0 && debt > 0 ? debt / monthly : null;

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  if (loans.length === 0) {
    return (
      <>
        <MoneyEmpty
          eyebrow="Records · Money · Loans"
          message="Nothing borrowed. When you lend yourself money - out of a goal's fund, or from nothing you track here - record it so the debt stays visible until it's paid back."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> New loan
            </Button>
          }
        />
        <LoanModal
          open={creating}
          onOpenChange={(o) => !o && closeModal()}
          loan={null}
          goals={goals}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-fg-2 text-sm">
          {open.length === 0 ? (
            "All settled"
          ) : (
            <>
              Owing{" "}
              <span className="text-fg font-mono" title={formatCurrency(centsToRand(debt))}>
                {formatCurrencyShort(centsToRand(debt))}
              </span>{" "}
              across {open.length} {open.length === 1 ? "loan" : "loans"}
            </>
          )}
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus /> New loan
        </Button>
      </div>

      {/* Debt summary, mirroring the Basic tab's monthly figures */}
      <div className="bg-surface grid grid-cols-1 gap-2 rounded-lg border p-4 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        <Figure label="Owed" value={formatZAR(centsToRand(debt))} danger={debt > 0} />
        <Figure label="Left to use" value={formatZAR(centsToRand(unused))} />
        <Figure label="Repaying / month" value={formatZAR(centsToRand(monthly))} />
        <Figure
          label="Paid off"
          value={
            debt === 0
              ? "settled"
              : eta === null
                ? "set monthly"
                : `≈ ${format(etaTargetDate(eta), "MMM yyyy")}`
          }
        />
      </div>

      {open.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {open.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              onEdit={() => setEditing(loan)}
              onRepay={() => setRepaying(loan)}
            />
          ))}
        </div>
      ) : null}

      {settled.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-fg-2 text-sm font-semibold">Settled</h2>
          <div className="space-y-2">
            {settled.map((loan) => (
              <button
                key={loan.id}
                type="button"
                onClick={() => setEditing(loan)}
                className="bg-surface hover:border-border-2 flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left opacity-60 transition-colors"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-fg block truncate text-sm font-medium">{loan.title}</span>
                  <span className="text-fg-3 block truncate text-xs">
                    {loan.goal ? `from ${loan.goal.name}` : "not from a goal"}
                    {loan.settledAt ? ` · settled ${format(loan.settledAt, "d MMM yyyy")}` : ""}
                  </span>
                </span>
                <span className="text-fg shrink-0 font-mono text-sm">
                  {formatZAR(centsToRand(loan.principal))}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <LoanModal
        open={creating || editing !== null}
        onOpenChange={(o) => !o && closeModal()}
        loan={editing}
        goals={goals}
      />
      <RepayDialog loan={repaying} onOpenChange={(o) => !o && setRepaying(null)} />
    </div>
  );
}

function LoanCard({
  loan,
  onEdit,
  onRepay,
}: {
  loan: Loan;
  onEdit: () => void;
  onRepay: () => void;
}) {
  const outstanding = loanOutstanding(loan);
  const percent = loan.principal > 0 ? Math.round((loan.repaid / loan.principal) * 100) : 0;
  const eta = monthsToClear(outstanding, loan.monthlyAmount, loan);
  const extra = extraLabel(loan, (cents) => formatCurrencyShort(centsToRand(cents)));
  const left = loanUnused(loan);
  const over = loanOverdrawn(loan);

  return (
    <div className="bg-surface hover:border-border-2 flex flex-col gap-3 rounded-lg border p-4 transition-colors">
      <button type="button" onClick={onEdit} className="flex flex-col gap-3 text-left">
        <div className="flex items-start justify-between gap-2">
          <span className="text-fg min-w-0 truncate font-medium">{loan.title}</span>
          <span className="bg-surface-3 text-fg-2 shrink-0 rounded-full px-2 py-0.5 text-[11px]">
            {loan.goal ? `from ${loan.goal.name}` : "no goal"}
          </span>
        </div>

        <div className="bg-surface-3 h-2.5 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full"
            style={{ width: `${percent}%`, background: "var(--accent)" }}
          />
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate font-mono" title={formatCurrency(centsToRand(outstanding))}>
            <span className="text-[var(--warning)]">{formatZAR(centsToRand(outstanding))}</span>
            <span className="text-fg-3"> owed</span>
          </span>
          <span className="text-fg-3 shrink-0 font-mono text-xs">{percent}% repaid</span>
        </div>

        <p className="text-fg-3 font-mono text-xs break-words">
          {formatCurrencyShort(centsToRand(loan.repaid))} of{" "}
          {formatCurrencyShort(centsToRand(loan.principal))} back
          {eta !== null ? (
            <span className="text-fg-2">
              {" · ≈ "}
              {formatEta(eta)} · {format(etaTargetDate(eta), "MMM yyyy")}
            </span>
          ) : (
            <span className="text-[var(--warning)]"> · set a monthly amount for an ETA</span>
          )}
          {extra ? <span className="text-fg-3">{` · plus ${extra}`}</span> : null}
        </p>

        <p className="text-fg-3 font-mono text-xs break-words">
          {formatCurrencyShort(centsToRand(loan.used))} of{" "}
          {formatCurrencyShort(centsToRand(loan.principal))} used
          {over > 0 ? (
            <span className="text-[var(--warning)]">
              {" · over by "}
              {formatCurrencyShort(centsToRand(over))}
            </span>
          ) : left > 0 ? (
            <span className="text-fg-2">
              {" · "}
              {formatCurrencyShort(centsToRand(left))} left to use
            </span>
          ) : (
            <span className="text-fg-2"> · all used</span>
          )}
        </p>
      </button>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={onRepay}>
          Repay
        </Button>
      </div>
    </div>
  );
}

// Small dialog to record a repayment against one loan.
function RepayDialog({
  loan,
  onOpenChange,
}: {
  loan: Loan | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const outstanding = loan ? loanOutstanding(loan) : 0;

  function close() {
    setAmount("");
    onOpenChange(false);
  }

  function submit() {
    const value = Number(amount);
    if (!loan || !Number.isFinite(value) || value <= 0) return;
    startTransition(async () => {
      try {
        await repayLoan(loan.id, Math.min(value, centsToRand(outstanding)));
        toast.success("Repayment recorded");
        close();
        router.refresh();
      } catch {
        toast.error("Could not record the repayment");
      }
    });
  }

  return (
    <Dialog open={loan !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Repay {loan?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-fg-2 text-sm">
            <span className="text-fg font-mono">{formatZAR(centsToRand(outstanding))}</span>{" "}
            outstanding
            {loan?.goal ? (
              <span className="text-fg-3"> · repayments flow back into {loan.goal.name}</span>
            ) : null}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="repay-amount">Amount</Label>
            <div className="relative">
              <span className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 font-mono text-sm">
                R
              </span>
              <Input
                id="repay-amount"
                type="number"
                step="0.01"
                min="0"
                max={MAX_DB_AMOUNT}
                className="pl-7 font-mono"
                value={amount}
                onChange={(e) => setAmount(stripNegative(e.target.value))}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAmount(String(centsToRand(outstanding)))}
            >
              Settle in full
            </Button>
            <Button type="button" onClick={submit} disabled={pending || !Number(amount)}>
              {pending ? "Saving…" : "Repay"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Figure({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 sm:block")}>
      <p className="text-fg-3 font-mono text-[10.5px] uppercase tracking-[0.08em]">{label}</p>
      <p
        className="text-fg font-mono text-lg font-medium tabular-nums sm:mt-1"
        style={danger ? { color: "var(--warning)" } : undefined}
      >
        {value}
      </p>
    </div>
  );
}
