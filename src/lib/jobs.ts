import { z } from "zod";

const dayRegex = /^\d{4}-\d{2}-\d{2}$/;

// The four Kanban columns, in fixed order, and the result an application carries
// once it reaches the outcome column.
export const APP_STAGES = ["applied", "interview", "offer", "outcome"] as const;
export type AppStageKey = (typeof APP_STAGES)[number];

export const APP_OUTCOMES = ["accepted", "rejected", "withdrawn"] as const;
export type AppOutcome = (typeof APP_OUTCOMES)[number];

// Column metadata. The status dot rides a status token in the UI; the label
// carries the stage so colour never stands alone.
export const STAGE_META: Record<AppStageKey, { label: string }> = {
  applied: { label: "Applied" },
  interview: { label: "Interview" },
  offer: { label: "Offer" },
  outcome: { label: "Outcome" },
};

export const OUTCOME_META: Record<AppOutcome, { label: string }> = {
  accepted: { label: "Accepted" },
  rejected: { label: "Rejected" },
  withdrawn: { label: "Withdrawn" },
};

// Shared validation for the application form. value is entered in rand (optional,
// a salary or award) and converted to cents in the action.
export const applicationSchema = z.object({
  organisation: z.string().min(1, "Who did you apply to?"),
  position: z.string().min(1, "What did you apply for?"),
  location: z.string().nullable(),
  value: z.number().min(0).nullable(),
  status: z.enum(APP_STAGES),
  outcome: z.enum(APP_OUTCOMES).nullable(),
  appliedDate: z.string().regex(dayRegex, "Use yyyy-MM-dd").nullable(),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

// Shared validation for a stage note. label is the stage the note belongs to.
export const stageNoteSchema = z.object({
  label: z.string().min(1),
  note: z.string(),
  date: z.string().regex(dayRegex, "Use yyyy-MM-dd").nullable(),
});

export type StageNoteInput = z.infer<typeof stageNoteSchema>;
