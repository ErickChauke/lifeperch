"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/money", label: "Overview" },
  { href: "/money/transactions", label: "Transactions" },
  { href: "/money/loans", label: "Loans" },
  { href: "/money/goals", label: "Goals" },
  { href: "/money/shopping", label: "Shopping" },
  { href: "/money/wishlist", label: "Wishlist" },
  { href: "/money/plan", label: "Plan" },
  { href: "/money/basic", label: "Basic" },
];

// Sub-nav for the Money module: pinned on desktop, sticky-blurred on mobile.
// The active tab gets a 2px accent underline. Overview matches the bare /money
// route; the rest match their prefix.
export function MoneySubnav() {
  const pathname = usePathname();

  return (
    <nav className="bg-background/85 sticky top-0 z-20 shrink-0 border-b px-5 backdrop-blur-[10px] md:static md:bg-background md:px-8 md:backdrop-blur-none">
      <div className="scrollbar-hide flex gap-6 overflow-x-auto">
        {TABS.map((tab) => {
          const active =
            tab.href === "/money"
              ? pathname === "/money"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative -mb-px flex h-11 shrink-0 items-center text-sm transition-colors",
                active ? "text-fg" : "text-fg-3 hover:text-fg-2",
              )}
            >
              {tab.label}
              {active ? (
                <span
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
