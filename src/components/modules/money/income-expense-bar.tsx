"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatZAR } from "@/lib/utils";

export type MonthBar = { label: string; income: number; expense: number };

// Compact rand axis ticks: R 0, R 25k, R 1.2m.
function axisTick(value: number): string {
  if (value >= 1_000_000) return `R ${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1000) return `R ${Math.round(value / 1000)}k`;
  return `R ${value}`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface rounded-sm border px-3 py-2 shadow-[var(--shadow-pop)]">
      <p className="text-fg-2 mb-1 font-mono text-xs">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-xs">
          <span
            className="size-2 rounded-[3px]"
            style={{ background: entry.color }}
          />
          <span className="text-fg-2 capitalize">{entry.name}</span>
          <span className="text-fg ml-auto font-mono">{formatZAR(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function IncomeExpenseBar({ data }: { data: MonthBar[] }) {
  return (
    <div className="font-mono">
      <div className="mb-3 flex items-center justify-end gap-4 text-xs">
        <span className="text-fg-2 flex items-center gap-1.5">
          <span className="size-2 rounded-[3px]" style={{ background: "var(--chart-2)" }} />
          Income
        </span>
        <span className="text-fg-2 flex items-center gap-1.5">
          <span className="size-2 rounded-[3px]" style={{ background: "var(--chart-4)" }} />
          Expense
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={4} barCategoryGap="28%">
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--text-3)", fontSize: 11 }}
          />
          <YAxis
            tickFormatter={axisTick}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-3)", fontSize: 11 }}
            width={52}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            content={<ChartTooltip />}
          />
          <Bar dataKey="income" fill="var(--chart-2)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="expense" fill="var(--chart-4)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
