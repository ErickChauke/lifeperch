import Link from "next/link";
import { format } from "date-fns";
import {
  Calendar,
  BookText,
  Wallet,
  Repeat,
  ArrowRight,
  PenLine,
  Check,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getTodayTodos } from "@/actions/todo";
import { getEvents } from "@/actions/timetable";
import { getHabits } from "@/actions/habits";
import { getJobs } from "@/actions/jobs";
import { getMilestones } from "@/actions/timeline";
import { getEntryByDate } from "@/actions/journal";
import { getTransactions } from "@/actions/money";
import { getMedicines } from "@/actions/medicines";
import { PageShell, PageBody } from "@/components/layout/page-shell";
import { DashboardGreeting } from "@/components/modules/dashboard/dashboard-greeting";
import { TodaysTodos } from "@/components/modules/dashboard/todays-todos";
import { QuickAddTodo } from "@/components/modules/dashboard/quick-add-todo";
import { TodayAgenda } from "@/components/modules/dashboard/today-agenda";
import { TodayHabits } from "@/components/modules/dashboard/today-habits";
import { DueSoon } from "@/components/modules/dashboard/due-soon";
import { MoneySnapshot } from "@/components/modules/dashboard/money-snapshot";
import { MedsToday } from "@/components/modules/dashboard/meds-today";

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
    desc: "A line or a page - the journal is always open.",
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
  const todayStr = format(now, "yyyy-MM-dd");
  const [
    { today: dueToday, overdue },
    events,
    habits,
    jobs,
    milestones,
    journalEntry,
    transactions,
    medicines,
  ] = await Promise.all([
    getTodayTodos(),
    getEvents(),
    getHabits(),
    getJobs(),
    getMilestones(),
    getEntryByDate(todayStr),
    getTransactions(),
    getMedicines(),
  ]);
  const hasTodos = dueToday.length > 0 || overdue.length > 0;
  const activeHabits = habits.filter((h) => !h.archived);
  const journaledToday = !!journalEntry && journalEntry.body.trim().length > 0;

  return (
    <PageShell>
      <PageBody>
        <div className="mx-auto max-w-[720px] pt-6 md:pt-12">
          <DashboardGreeting
            name={name}
            initialDate={format(now, "EEEE d MMMM").toUpperCase()}
            initialGreeting={
              now.getHours() < 12
                ? "Good morning"
                : now.getHours() < 18
                  ? "Good afternoon"
                  : "Good evening"
            }
          />

          {hasTodos ? (
            <TodaysTodos
              today={todayStr}
              dueToday={dueToday}
              overdue={overdue}
            />
          ) : (
            <p className="text-fg-2 mt-4 max-w-[52ch] text-lg leading-relaxed">
              Nothing scheduled, nothing overdue. This is the shell every part of
              LifePerch lives inside - pick a place to begin.
            </p>
          )}

          <div className="mt-6">
            <QuickAddTodo today={todayStr} />
          </div>

          <TodayAgenda events={events} todos={dueToday} today={todayStr} />

          <TodayHabits habits={activeHabits} today={todayStr} />

          <DueSoon jobs={jobs} milestones={milestones} today={todayStr} />

          <MedsToday medicines={medicines} today={todayStr} />

          <MoneySnapshot transactions={transactions} today={todayStr} />

          <Link
            href="/journal"
            className="bg-surface hover:bg-surface-2 mt-8 flex items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors"
          >
            <span
              className={
                journaledToday
                  ? "bg-primary flex size-5 shrink-0 items-center justify-center rounded-full text-[var(--accent-fg)]"
                  : "border-border-2 text-fg-3 flex size-5 shrink-0 items-center justify-center rounded-full border"
              }
            >
              {journaledToday ? (
                <Check className="size-3" strokeWidth={3} />
              ) : (
                <PenLine className="size-3" />
              )}
            </span>
            <span className="text-fg flex-1 text-sm">
              {journaledToday ? "Journaled today" : "Write today's entry"}
            </span>
            <ArrowRight className="text-fg-4 size-4" strokeWidth={1.75} />
          </Link>

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
                    <Icon
                      className="text-accent-read size-5"
                      strokeWidth={1.75}
                    />
                  </span>
                  <ArrowRight
                    className="text-fg-4 size-4 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--accent-read)]"
                    strokeWidth={1.75}
                  />
                </div>
                <div>
                  <p className="text-[15px] font-semibold">{title}</p>
                  <p className="text-fg-2 mt-1 text-[13px] leading-relaxed">
                    {desc}
                  </p>
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
      </PageBody>
    </PageShell>
  );
}
