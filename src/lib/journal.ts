import { z } from "zod";
import { RICH_BODY_MAX, bodyFormatSchema } from "@/lib/rich-text";

// Mood is a 1-10 score. A day with no entry opens at the neutral default.
export const MOOD_MIN = 1;
export const MOOD_MAX = 10;
export const MOOD_DEFAULT = 5;

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Shared validation for the journal editor and the server actions. The day is
// the key: there is exactly one entry per date, identified by the "yyyy-MM-dd"
// string.
export const entrySchema = z.object({
  date: z.string().regex(dateRegex, "Use yyyy-MM-dd"),
  title: z.string().nullable(),
  body: z.string().max(RICH_BODY_MAX),
  bodyFormat: bodyFormatSchema,
  mood: z.number().int().min(MOOD_MIN).max(MOOD_MAX),
});

export type EntryInput = z.infer<typeof entrySchema>;

// Validates the fields returned from a Cloudinary browser upload before an
// attachment row is stored. Mirrors the notes attachment schema.
export const attachmentSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  publicId: z.string().min(1),
  format: z.string().nullable().optional(),
  bytes: z.number().nullable().optional(),
});

export type AttachmentInput = z.infer<typeof attachmentSchema>;

// Converts a "yyyy-MM-dd" day string to a UTC-midnight Date for the @db.Date
// column, so the stored day never drifts with the local timezone.
export function dayToDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

// Formats a stored Date back to the "yyyy-MM-dd" day key.
export function dateToDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
