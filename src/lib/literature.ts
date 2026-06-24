import { z } from "zod";
import { RICH_BODY_MAX, bodyFormatSchema } from "@/lib/rich-text";

// Reading status for a paper, shown as a badge.
export const LIT_STATUSES = [
  { value: "to-read", label: "To read" },
  { value: "reading", label: "Reading" },
  { value: "read", label: "Read" },
] as const;

export type LitStatus = (typeof LIT_STATUSES)[number]["value"];

const STATUS_VALUES = LIT_STATUSES.map((s) => s.value) as [LitStatus, ...LitStatus[]];

// Returns the label for a status value.
export function statusLabel(status: string): string {
  return LIT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

// Shared validation for the literature form and the server actions. A paper has
// either an uploaded PDF (fileUrl + publicId) or an external link (url), or
// neither.
export const literatureSchema = z.object({
  title: z.string().min(1, "Title is required"),
  authors: z.string(),
  year: z.number().int().nullable(),
  status: z.enum(STATUS_VALUES),
  url: z.string().nullable(),
  fileUrl: z.string().nullable(),
  publicId: z.string().nullable(),
  notes: z.string().max(RICH_BODY_MAX),
  notesFormat: bodyFormatSchema,
  tags: z.array(z.string()),
});

export type LiteratureInput = z.infer<typeof literatureSchema>;
