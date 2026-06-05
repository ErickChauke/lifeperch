"use client";

import { usePathname } from "next/navigation";
import { Search, Bell } from "lucide-react";
import { modules } from "@config/modules.config";

// Derives the current page name from the path: prefers a module label, else
// title-cases the first segment. Defaults to Dashboard at the app root.
function pageName(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (!segment) return "Dashboard";
  const match = modules.find((m) => m.href === `/${segment}`);
  if (match) return match.label;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

// Top bar: LifePerch / <Page> breadcrumb, search pill, notifications bell.
export function Topbar() {
  const pathname = usePathname();
  const page = pageName(pathname);

  return (
    <header className="bg-background/80 sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b px-8 backdrop-blur-[10px]">
      <p className="text-[15px] font-semibold">
        <span className="text-fg-3 font-normal">LifePerch</span>
        <span className="text-fg-4 px-1.5 font-normal">/</span>
        <span className="text-fg">{page}</span>
      </p>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="bg-surface-2 text-fg-3 hover:border-border-2 hidden h-9 w-60 items-center gap-2 rounded-[var(--r)] border px-3 text-left transition-colors md:flex"
        >
          <Search className="size-4 shrink-0" strokeWidth={1.75} />
          <span className="flex-1 truncate text-[13px]">Search everything…</span>
          <kbd className="bg-surface text-fg-3 rounded-[8px] border px-1.5 py-0.5 font-mono text-[11px]">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="text-fg-2 hover:bg-surface-2 hover:text-fg flex size-9 items-center justify-center rounded-[var(--r-sm)] transition-colors"
        >
          <Bell className="size-[18px]" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}
