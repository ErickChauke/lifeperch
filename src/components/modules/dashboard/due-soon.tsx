import Link from "next/link";
import { addDays, format, parseISO } from "date-fns";
import { dateToDay } from "@/lib/money";
import type { getJobs } from "@/actions/jobs";
import type { getMilestones } from "@/actions/timeline";

type Job = Awaited<ReturnType<typeof getJobs>>[number];
type Milestone = Awaited<ReturnType<typeof getMilestones>>[number];

type Item = { id: string; day: string; label: string; sub: string; href: string };

const HORIZON_DAYS = 14;

// Forward look across modules: application deadlines, interview/stage dates, and
// milestone target dates landing within the next two weeks, merged and sorted by
// date. Read-only.
export function DueSoon({
  jobs,
  milestones,
  today,
}: {
  jobs: Job[];
  milestones: Milestone[];
  today: string;
}) {
  const end = format(addDays(parseISO(today), HORIZON_DAYS), "yyyy-MM-dd");
  const within = (d: string) => d >= today && d <= end;

  const items: Item[] = [
    ...jobs
      .filter((j) => j.deadline && j.status !== "outcome")
      .map((j) => ({ job: j, day: dateToDay(j.deadline!) }))
      .filter((x) => within(x.day))
      .map(({ job, day }) => ({
        id: `j-${job.id}`,
        day,
        label: `${job.position} · ${job.organisation}`,
        sub: "Deadline",
        href: "/jobs",
      })),
    ...milestones
      .filter((m) => m.status !== "done")
      .map((m) => ({ milestone: m, day: dateToDay(m.targetDate) }))
      .filter((x) => within(x.day))
      .map(({ milestone, day }) => ({
        id: `m-${milestone.id}`,
        day,
        label: milestone.title,
        sub: milestone.timeline?.name ?? "Milestone",
        href: "/timeline",
      })),
    ...jobs
      .filter((j) => j.status !== "outcome")
      .flatMap((j) =>
        j.stages
          .filter((s) => s.date)
          .map((s) => ({ job: j, stage: s, day: dateToDay(s.date!) })),
      )
      .filter((x) => within(x.day))
      .map(({ job, stage, day }) => ({
        id: `s-${stage.id}`,
        day,
        label: `${stage.label} · ${job.organisation}`,
        sub: "Interview",
        href: "/jobs",
      })),
  ].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));

  if (items.length === 0) return null;

  return (
    <div className="mt-8 space-y-2">
      <h3 className="text-fg-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
        Due soon
      </h3>
      <div className="space-y-1.5">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="bg-surface hover:bg-surface-2 flex items-center gap-3 rounded-md border border-border px-3 py-2 transition-colors"
          >
            <span className="text-fg-3 w-16 shrink-0 font-mono text-[11px]">
              {item.day === today ? "Today" : format(parseISO(item.day), "EEE d")}
            </span>
            <span className="text-fg min-w-0 flex-1 truncate text-sm">
              {item.label}
            </span>
            <span className="text-fg-3 shrink-0 text-[11px]">{item.sub}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
