"use client";

import type { User } from "next-auth";
import { BrandMark } from "@/components/brand-mark";
import { NavLinks } from "@/components/layout/nav-links";
import { AccountMenu } from "@/components/layout/account-menu";
import { useSidebar } from "@/components/layout/sidebar-context";
import { cn } from "@/lib/utils";

// App sidebar: header (brand) -> grouped nav -> user footer.
// Fixed to the viewport on desktop; off-canvas drawer on mobile.
// Nav links are driven by config/modules.config.ts.
export function Sidebar({ user }: { user: User }) {
  const { open, setOpen } = useSidebar();

  return (
    <>
      {/* Mobile drawer scrim */}
      {open && (
        <div
          aria-hidden
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "bg-surface h-viewport fixed top-0 left-0 z-50 flex w-64 flex-col border-r transition-transform duration-200",
          open ? "translate-x-0 shadow-[var(--shadow-pop)]" : "-translate-x-full",
          "md:z-40 md:translate-x-0 md:shadow-none md:transition-none",
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 px-5">
          <BrandMark size={30} />
          <span className="text-lg font-semibold tracking-[-0.02em]">
            LifePerch
          </span>
        </div>

        <nav className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-4">
          <NavLinks />
        </nav>

        <div className="shrink-0 border-t p-3">
          <AccountMenu user={user} />
        </div>
      </aside>
    </>
  );
}
