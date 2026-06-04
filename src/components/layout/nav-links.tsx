"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, type LucideIcon } from "lucide-react";
import { modules } from "@config/modules.config";
import { cn } from "@/lib/utils";

// Maps the icon name stored in modules.config to a lucide component.
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  calendar: Calendar,
};

type NavItem = { label: string; href: string; icon: LucideIcon };

// Dashboard is always present; module links come from the registry.
const STATIC_LINKS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

// Renders the sidebar nav from the module registry with active highlighting.
export function NavLinks() {
  const pathname = usePathname();

  const moduleLinks: NavItem[] = modules
    .filter((m) => m.enabled)
    .map((m) => ({
      label: m.label,
      href: m.href,
      icon: ICONS[m.icon] ?? Calendar,
    }));

  const links = [...STATIC_LINKS, ...moduleLinks];

  return (
    <div className="flex flex-col gap-1">
      {links.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
