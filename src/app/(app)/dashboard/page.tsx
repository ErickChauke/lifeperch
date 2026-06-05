import Link from "next/link";
import { format } from "date-fns";
import { Calendar, BookText, Wallet, Repeat, ArrowRight, type LucideIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { DashboardGreeting } from "@/components/modules/dashboard/dashboard-greeting";

type QuickStart = {
  title: string;
  desc: string;
  href: string;
  icon: LucideIcon;
};

const QUICK_STARTS: QuickStart[] = [
  {
    title: "Plan your day",
    desc: "Lay out classes, blocks & deadlines on the timetable.",
    href: "/timetable",
    icon: Calendar,
  },
  {
    title: "Write today's entry",
    desc: "A line or a page — the journal is always open.",
    href: "/journal",
    icon: BookText,
  },
  {
    title: "Log a transaction",
    desc: "Track what comes in and what goes out.",
    href: "/money",
    icon: Wallet,
  },
  {
    title: "Set a habit",
    desc: "Define what 'doing the work' looks like, daily.",
    href: "/habits",
    icon: Repeat,
  },
];

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name?.split(" ")[0] ?? "there";
  const now = new Date();

  return (
    <div className="mx-auto max-w-[720px] pt-12">
      <DashboardGreeting
        name={name}
        initialDate={format(now, "EEEE d MMMM").toUpperCase()}
        initialGreeting={now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening"}
      />

      <p className="text-fg-2 mt-4 max-w-[52ch] text-lg leading-relaxed">
        Nothing scheduled, nothing overdue. This is the shell every part of
        LifePerch lives inside — pick a place to begin.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {QUICK_STARTS.map(({ title, desc, href, icon: Icon }) => (
          <Link
            key={title}
            href={href}
            className="group bg-surface hover:border-border-2 hover:bg-surface-2 flex flex-col gap-3 rounded-[var(--r-lg)] border p-5 transition-all duration-150 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <span
                className="flex size-10 items-center justify-center rounded-[var(--r)]"
                style={{ background: "var(--accent-soft)" }}
              >
                <Icon className="text-accent-read size-5" strokeWidth={1.75} />
              </span>
              <ArrowRight
                className="text-fg-4 size-4 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--accent-read)]"
                strokeWidth={1.75}
              />
            </div>
            <div>
              <p className="text-[15px] font-semibold">{title}</p>
              <p className="text-fg-2 mt-1 text-[13px] leading-relaxed">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <p className="text-fg-3 mt-8 flex items-center justify-center gap-1.5 text-[13px]">
        Jump anywhere with
        <kbd className="bg-surface-2 text-fg-3 rounded-[8px] border px-1.5 py-0.5 font-mono text-[11px]">
          ⌘
        </kbd>
        <kbd className="bg-surface-2 text-fg-3 rounded-[8px] border px-1.5 py-0.5 font-mono text-[11px]">
          K
        </kbd>
      </p>
    </div>
  );
}
