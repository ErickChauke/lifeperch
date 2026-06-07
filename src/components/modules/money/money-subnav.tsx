"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/money", label: "Overview" },
  { href: "/money/transactions", label: "Transactions" },
  { href: "/money/goals", label: "Goals" },
  { href: "/money/shopping", label: "Shopping" },
  { href: "/money/wishlist", label: "Wishlist" },
];

// Sticky sub-nav for the Money module. The active tab gets a 2px accent
// underline. Overview matches the bare /money route; the rest match their prefix.
export function MoneySubnav() {
  const pathname = usePathname();

  return (
    <nav className="bg-background sticky top-16 z-20 -mx-8 -mt-12 mb-8 border-b px-8">
      <div className="flex gap-6">
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
                "relative -mb-px flex h-11 items-center text-sm transition-colors",
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
