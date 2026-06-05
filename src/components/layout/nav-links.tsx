"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Repeat,
  BookText,
  FileText,
  Wallet,
  Activity,
  BookOpen,
  Briefcase,
  Lock,
  GitBranch,
  type LucideIcon,
} from "lucide-react";
import { modules, GROUP_ORDER, type ModuleGroup } from "@config/modules.config";
import { cn } from "@/lib/utils";

// Maps the icon name stored in modules.config to a lucide component.
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  calendar: Calendar,
  habits: Repeat,
  journal: BookText,
  notes: FileText,
  money: Wallet,
  health: Activity,
  literature: BookOpen,
  jobs: Briefcase,
  vault: Lock,
  timeline: GitBranch,
};

// Renders the sidebar nav grouped by section, with active highlighting.
export function NavLinks() {
  const pathname = usePathname();

  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: modules.filter((m) => m.enabled && m.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {groups.map(({ group, items }) => (
        <NavGroup key={group} label={group} pathname={pathname} items={items} />
      ))}
    </div>
  );
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: ModuleGroup;
  items: (typeof modules)[number][];
  pathname: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-fg-3 px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.10em]">
        {label}
      </span>
      {items.map((m) => {
        const Icon = ICONS[m.icon] ?? Calendar;
        const active =
          pathname === m.href || pathname.startsWith(`${m.href}/`);
        return (
          <Link
            key={m.href}
            href={m.href}
            className={cn(
              "relative flex h-[38px] items-center gap-3 rounded-[var(--r)] px-3 text-sm font-medium transition-colors",
              active
                ? "bg-accent-soft text-accent-read"
                : "text-fg-2 hover:bg-surface-2 hover:text-fg",
            )}
          >
            {active ? (
              <span
                className="absolute top-1/2 -left-3 h-[18px] w-[3px] -translate-y-1/2 rounded-r-[3px]"
                style={{ background: "var(--accent)" }}
              />
            ) : null}
            <Icon className="size-5 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{m.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
