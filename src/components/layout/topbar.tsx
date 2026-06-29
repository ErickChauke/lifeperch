"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { modules } from "@config/modules.config";
import { useSidebar } from "@/components/layout/sidebar-context";
import { CommandPalette } from "@/components/layout/command-palette";

// Derives the current page name from the path: prefers a module label, else
// title-cases the first segment. Defaults to Dashboard at the app root.
function pageName(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (!segment) return "Dashboard";
  const match = modules.find((m) => m.href === `/${segment}`);
  if (match) return match.label;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

// Top bar: hamburger (mobile), LifePerch / <Page> breadcrumb, search pill,
// notifications bell. Pinned in the shell, so no sticky positioning needed.
export function Topbar() {
  const pathname = usePathname();
  const page = pageName(pathname);
  const { toggle } = useSidebar();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b px-5 md:gap-4 md:px-8">
      <button
        type="button"
        aria-label="Open navigation"
        title="Open navigation"
        onClick={toggle}
        className="text-fg-2 hover:bg-surface-2 hover:text-fg -ml-1 flex size-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] transition-colors md:hidden"
      >
        <Menu className="size-[18px]" strokeWidth={1.75} />
      </button>

      <p className="min-w-0 truncate text-[15px] font-semibold">
        <span className="text-fg-3 font-normal">LifePerch</span>
        <span className="text-fg-4 px-1.5 font-normal">/</span>
        <span className="text-fg">{page}</span>
      </p>

      <div className="ml-auto flex items-center gap-2">
        <CommandPalette />

        <button
          type="button"
          aria-label="Notifications"
          title="Notifications"
          className="text-fg-2 hover:bg-surface-2 hover:text-fg flex size-9 items-center justify-center rounded-[var(--r-sm)] transition-colors"
        >
          <Bell className="size-[18px]" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}
