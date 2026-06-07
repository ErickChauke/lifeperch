"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addMonths,
  addYears,
  format,
  getMonth,
  getYear,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Star,
  Plus,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";
import {
  summarize,
  spendingByCategory,
  monthlyTotals,
  txnsInPeriod,
} from "@/lib/money-stats";
import { goalPercent, monthsToGoal } from "@/lib/goals";
import { Segmented } from "./segmented";
import { MoneyEmpty } from "./money-empty";
import { SpendingDonut } from "./spending-donut";
import { IncomeExpenseBar } from "./income-expense-bar";
import type { getTransactions } from "@/actions/money";
import type { getGoals } from "@/actions/goals";
import type { getShoppingItems } from "@/actions/shopping";
import type { getWishes } from "@/actions/wishlist";

type Transaction = Awaited<ReturnType<typeof getTransactions>>[number];
type Goal = Awaited<ReturnType<typeof getGoals>>[number];
type ShoppingItem = Awaited<ReturnType<typeof getShoppingItems>>[number];
type Wish = Awaited<ReturnType<typeof getWishes>>[number];

const SCALES = [
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
] as const;

type Scale = (typeof SCALES)[number]["value"];

// One card surface.
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-surface rounded-lg border p-5", className)}>{children}</div>;
}

export function DashboardBoard({
  transactions,
  goals,
  shopping,
  wishes,
}: {
  transactions: Transaction[];
  goals: Goal[];
  shopping: ShoppingItem[];
  wishes: Wish[];
}) {
  const router = useRouter();
  const [scale, setScale] = useState<Scale>("month");
  const [period, setPeriod] = useState(() => new Date());

  const periodLabel = scale === "month" ? format(period, "MMM yyyy") : format(period, "yyyy");

  const periodTxns = useMemo(
    () => txnsInPeriod(transactions, scale, period),
    [transactions, scale, period],
  );
  const summary = useMemo(() => summarize(periodTxns), [periodTxns]);
  const spending = useMemo(() => spendingByCategory(periodTxns), [periodTxns]);

  const barData = useMemo(() => {
    const starts =
      scale === "month"
        ? Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(period, 5 - i)))
        : Array.from({ length: 12 }, (_, i) => new Date(getYear(period), i, 1));
    return monthlyTotals(transactions, starts).map((m) => ({
      label: scale === "month" ? format(m.month, "MMM") : format(m.month, "MMMMM"),
      income: centsToRand(m.income),
      expense: centsToRand(m.expense),
    }));
  }, [transactions, scale, period]);

  if (transactions.length === 0 && goals.length === 0) {
    return (
      <MoneyEmpty
        eyebrow="Records · Money"
        message="No money tracked yet. Log a transaction and your balance, spending and goals fill in here."
        action={
          <Link href="/money/transactions" className={buttonVariants()}>
            <Plus /> Add transaction
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Segmented options={SCALES} value={scale} onChange={setScale} />
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous period"
            onClick={() => setPeriod((p) => (scale === "month" ? subMonths(p, 1) : addYears(p, -1)))}
            className="text-fg-2 hover:bg-surface-2 flex size-8 items-center justify-center rounded-sm"
          >
            <ChevronLeft className="size-[17px]" />
          </button>
          <span className="text-fg w-24 text-center font-mono text-sm">{periodLabel}</span>
          <button
            type="button"
            aria-label="Next period"
            onClick={() => setPeriod((p) => (scale === "month" ? addMonths(p, 1) : addYears(p, 1)))}
            className="text-fg-2 hover:bg-surface-2 flex size-8 items-center justify-center rounded-sm"
          >
            <ChevronRight className="size-[17px]" />
          </button>
        </div>
      </div>

      <Summary summary={summary} periodLabel={periodLabel} />

      {scale === "year" ? <Expectations transactions={transactions} period={period} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-fg mb-4 font-semibold">Spending by category</h2>
          <SpendingDonut
            data={spending}
            spentCents={summary.spent}
            onCategoryClick={(c) =>
              router.push(`/money/transactions?category=${encodeURIComponent(c)}`)
            }
          />
        </Card>
        <Card>
          <h2 className="text-fg mb-1 font-semibold">Income vs expense</h2>
          <IncomeExpenseBar data={barData} />
        </Card>
      </div>

      <PlanningHub shopping={shopping} wishes={wishes} />

      <GoalStrip goals={goals} />
    </div>
  );
}

function Summary({
  summary,
  periodLabel,
}: {
  summary: { income: number; spent: number; invested: number; net: number };
  periodLabel: string;
}) {
  const cells = [
    { label: "In", cents: summary.income, sub: "income", danger: false },
    { label: "Spent", cents: summary.spent, sub: "spending", danger: false },
    { label: "Invested", cents: summary.invested, sub: "set aside to grow", danger: false },
    { label: "Net", cents: summary.net, sub: periodLabel, danger: summary.net < 0 },
  ];
  return (
    <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border lg:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label} className="bg-surface flex flex-col gap-1 p-5">
          <span className="text-fg-3 font-mono text-xs uppercase tracking-[0.10em]">
            {cell.label}
          </span>
          <span
            className={cn(
              "font-mono text-[25px] font-medium",
              cell.danger ? "text-[var(--danger)]" : "text-fg",
            )}
          >
            {formatZAR(centsToRand(cell.cents))}
          </span>
          <span className="text-fg-3 font-mono text-xs">{cell.sub}</span>
        </div>
      ))}
    </div>
  );
}

function Expectations({ transactions, period }: { transactions: Transaction[]; period: Date }) {
  const now = new Date();
  const refYear = getYear(period);
  const nowYear = getYear(now);
  const monthsElapsed = refYear < nowYear ? 12 : refYear > nowYear ? 0 : getMonth(now) + 1;
  const ytd = summarize(txnsInPeriod(transactions, "year", period));

  const basis =
    monthsElapsed === 0
      ? "no data yet"
      : refYear < nowYear
        ? "full year"
        : `from ${monthsElapsed} months so far`;

  const project = (cents: number) =>
    monthsElapsed === 0 ? null : Math.round((cents / monthsElapsed) * 12);

  const figures = [
    { label: "Income", cents: project(ytd.income), accent: false },
    { label: "Spending", cents: project(ytd.spent), accent: false },
    { label: "Invested", cents: project(ytd.invested), accent: true },
    { label: "Net", cents: project(ytd.net), accent: false },
  ];

  return (
    <div className="bg-surface rounded-lg border p-5">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-fg font-semibold">
          Expectations{" "}
          <span className="text-fg-3 font-mono text-sm font-normal">
            · projected by Dec {refYear}
          </span>
        </h2>
        <span className="text-fg-3 font-mono text-xs">{basis}</span>
      </div>
      <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-sm border lg:grid-cols-4">
        {figures.map((f) => (
          <div key={f.label} className="bg-surface flex flex-col gap-1 p-4">
            <span className="text-fg-3 font-mono text-xs uppercase tracking-[0.10em]">
              {f.label}
            </span>
            <span
              className={cn(
                "font-mono text-xl",
                f.cents !== null && f.cents < 0
                  ? "text-[var(--danger)]"
                  : f.accent
                    ? "text-accent-read"
                    : "text-fg",
              )}
            >
              {f.cents === null ? "—" : formatZAR(centsToRand(f.cents))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanningHub({
  shopping,
  wishes,
}: {
  shopping: ShoppingItem[];
  wishes: Wish[];
}) {
  const toBuy = shopping.filter((i) => !i.bought);
  const shopEstimate = toBuy.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const wishWorth = wishes.reduce((sum, w) => sum + w.price, 0);

  const cards = [
    {
      href: "/money/shopping",
      icon: ShoppingBag,
      title: "Shopping list",
      status:
        toBuy.length > 0
          ? `${formatZAR(centsToRand(shopEstimate))} · ${toBuy.length} to buy`
          : "List is clear",
    },
    {
      href: "/money/wishlist",
      icon: Star,
      title: "Wishlist",
      status:
        wishes.length > 0
          ? `${wishes.length} items · ${formatZAR(centsToRand(wishWorth))}`
          : "Nothing parked yet",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="bg-surface hover:bg-surface-2 hover:border-border-2 flex items-center gap-3 rounded-lg border p-4 transition-all hover:-translate-y-px"
        >
          <span className="bg-surface-2 text-fg-2 flex size-10 shrink-0 items-center justify-center rounded-sm">
            <card.icon className="size-5" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-fg block font-semibold">{card.title}</span>
            <span className="text-fg-3 block font-mono text-xs">{card.status}</span>
          </span>
          <ChevronRight className="text-fg-4 size-4 shrink-0" />
        </Link>
      ))}
    </div>
  );
}

function GoalStrip({ goals }: { goals: Goal[] }) {
  return (
    <div className="bg-surface rounded-lg border p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-fg font-semibold">Goals</h2>
        <Link href="/money/goals" className="text-fg-3 hover:text-fg-2 text-sm">
          View all →
        </Link>
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-fg-3 text-sm">No savings goals yet.</p>
          <Link href="/money/goals" className="text-accent-read text-sm">
            New goal
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <GoalRow key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalRow({ goal }: { goal: Goal }) {
  const percent = goalPercent(goal.currentAmount, goal.targetAmount);
  const reached = percent !== null && percent >= 100;
  const unset = goal.targetAmount <= 0;
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const eta = monthsToGoal(goal.currentAmount, goal.targetAmount, goal.monthlyAmount);

  const etaText = reached
    ? "Goal reached"
    : unset
      ? "set a target"
      : eta === null
        ? `${formatZAR(centsToRand(remaining))} to go · set a monthly amount`
        : `≈ ${eta} months to go`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-fg truncate font-medium">{goal.name}</span>
        <span className="text-fg-2 shrink-0 font-mono text-sm">
          {formatZAR(centsToRand(goal.currentAmount))} /{" "}
          {unset ? "—" : formatZAR(centsToRand(goal.targetAmount))}
        </span>
      </div>
      <div className="bg-surface-3 h-2 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent ?? 0}%`,
            background: reached ? "var(--success)" : "var(--accent)",
          }}
        />
      </div>
      <p
        className={cn(
          "font-mono text-xs",
          reached
            ? "text-[var(--success)]"
            : unset
              ? "text-[var(--warning)]"
              : "text-fg-3",
        )}
      >
        {etaText}
      </p>
    </div>
  );
}
