"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";

// The wedge colour for slot i: cycles through the five chart vars, dimming to
// 0.7 opacity once past the first cycle so repeats still read as distinct.
function chartVar(i: number) {
  return `var(--chart-${(i % 5) + 1})`;
}

type Slice = { category: string; total: number; fill: string; opacity: number };

export function SpendingDonut({
  data,
  spentCents,
  onCategoryClick,
}: {
  data: { category: string; total: number }[];
  spentCents: number;
  onCategoryClick: (category: string) => void;
}) {
  if (data.length === 0) {
    return (
      <p className="text-fg-3 py-12 text-center text-sm">
        No spending this period.
      </p>
    );
  }

  // Fold any tail past 8 categories into a single "Other" wedge.
  const head = data.slice(0, 8);
  const tail = data.slice(8);
  const slices: Slice[] = head.map((d, i) => ({
    ...d,
    fill: chartVar(i),
    opacity: i < 5 ? 1 : 0.7,
  }));
  if (tail.length > 0) {
    slices.push({
      category: "Other",
      total: tail.reduce((sum, d) => sum + d.total, 0),
      fill: "var(--surface-3)",
      opacity: 1,
    });
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <div className="relative h-[200px] w-full md:w-[200px] md:shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="total"
              nameKey="category"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="var(--surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.category} fill={s.fill} fillOpacity={s.opacity} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-fg-3 font-mono text-[10.5px] uppercase tracking-[0.10em]">
            Spent
          </span>
          <span className="text-fg font-mono text-xl">
            {formatZAR(centsToRand(spentCents))}
          </span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1">
        {slices.map((s) => {
          const clickable = s.category !== "Other";
          return (
            <li key={s.category}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onCategoryClick(s.category)}
                className="focus-visible:border-accent-line flex w-full items-center gap-2 rounded-sm border border-transparent px-2 py-1 text-left enabled:hover:bg-surface-2"
              >
                <span
                  className="size-2 shrink-0 rounded-[3px]"
                  style={{ background: s.fill, opacity: s.opacity }}
                />
                <span className="text-fg-2 min-w-0 flex-1 truncate text-sm">
                  {s.category}
                </span>
                <span className="text-fg shrink-0 font-mono text-sm">
                  {formatZAR(centsToRand(s.total))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
