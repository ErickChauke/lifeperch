"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

// The shared list-search box used across modules: an icon and a controlled
// text input. Filtering stays in the parent (case-insensitive contains).
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-[200px] flex-1", className)}>
      <Search className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-surface-2 placeholder:text-fg-3 focus-visible:border-accent-line h-9 w-full rounded-sm border pl-8 pr-3 text-sm outline-none"
      />
    </div>
  );
}
