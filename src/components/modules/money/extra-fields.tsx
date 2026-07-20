"use client";

import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EXTRA_FREQUENCIES } from "@/lib/extra";
import { MAX_DB_AMOUNT } from "@/lib/currency";
import { stripNegative } from "@/lib/money";

// The optional second contribution alongside the monthly amount: a repeating
// top-up, or a single payment expected on a date. Left at zero it changes
// nothing, and only a one-off asks for a date.
export function ExtraFields({
  amount,
  frequency,
  date,
  cadence,
  hint,
}: {
  amount: UseFormRegisterReturn;
  frequency: UseFormRegisterReturn;
  date: UseFormRegisterReturn;
  cadence: string | null;
  hint: string;
}) {
  return (
    <div className="space-y-2 rounded-[var(--r)] border p-3">
      <Label htmlFor="extraAmount">On top of that (optional)</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 font-mono text-sm">
            R
          </span>
          <Input
            id="extraAmount"
            type="number"
            step="0.01"
            min="0"
            max={MAX_DB_AMOUNT}
            placeholder="0"
            className="pl-7 font-mono"
            {...amount}
            onChange={(e) => {
              e.target.value = stripNegative(e.target.value);
              amount.onChange(e);
            }}
          />
        </div>
        <Select className="w-[152px] shrink-0" {...frequency}>
          {EXTRA_FREQUENCIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>
      {cadence === "once" ? <Input type="date" {...date} /> : null}
      <p className="text-fg-3 text-xs">{hint}</p>
    </div>
  );
}
