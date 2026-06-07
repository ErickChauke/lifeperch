"use client";

import { cn } from "@/lib/utils";

// Small segmented toggle: a pill track with the selected segment lifted onto the
// surface. Used for the dashboard scale, the transaction type, the type filter
// and the wish priority.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("bg-surface-2 inline-flex rounded-full p-1", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-surface text-fg shadow-[var(--shadow-card)]"
                : "text-fg-3 hover:text-fg-2",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
