import { z } from "zod";

const dayRegex = /^\d{4}-\d{2}-\d{2}$/;

// A milestone's status drives both the card badge and the rail node ring.
export const MILESTONE_STATUSES = ["planned", "in-progress", "done"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const STATUS_META: Record<MilestoneStatus, { label: string }> = {
  planned: { label: "Planned" },
  "in-progress": { label: "In progress" },
  done: { label: "Done" },
};

// The named tracks offered in the modal. A milestone may belong to none; the rail
// stays a single flat chronological line and the track reads as a label badge.
export const TRACKS = ["Career", "Education", "Personal"] as const;
export type Track = (typeof TRACKS)[number];

// Shared validation for the milestone form and the server actions.
export const milestoneSchema = z.object({
  title: z.string().min(1, "Name the milestone"),
  description: z.string().nullable(),
  targetDate: z.string().regex(dayRegex, "Use yyyy-MM-dd"),
  status: z.enum(MILESTONE_STATUSES),
  track: z.enum(TRACKS).nullable(),
});

export type MilestoneInput = z.infer<typeof milestoneSchema>;

// True when a milestone is overdue: not done and its target date is before today.
// Computed from the date, never stored.
export function isOverdue(status: string, targetDay: string, today: string): boolean {
  return status !== "done" && targetDay < today;
}
