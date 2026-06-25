import { z } from "zod";
import { RICH_BODY_MAX, bodyFormatSchema } from "@/lib/rich-text";

// Shared validation for the note form and the server actions. Title may be left
// blank in the editor; the action falls back to a placeholder so every note has
// a usable card label. bodyFormat marks whether body is legacy markdown or the
// rich editor's html.
export const noteSchema = z.object({
  title: z.string(),
  body: z.string().max(RICH_BODY_MAX),
  bodyFormat: bodyFormatSchema,
  tags: z.array(z.string()),
});

export type NoteInput = z.infer<typeof noteSchema>;

// Validation for a notebook: a title and an optional description.
export const noteCollectionSchema = z.object({
  title: z.string().min(1, "Name the notebook"),
  description: z.string().nullable().optional(),
});

export type NoteCollectionInput = z.infer<typeof noteCollectionSchema>;

// Validation for a note attachment. The upload fields come from the signed browser
// upload; name defaults to the original file name.
export const attachmentSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  publicId: z.string().min(1),
  format: z.string().nullable().optional(),
  bytes: z.number().nullable().optional(),
});

export type AttachmentInput = z.infer<typeof attachmentSchema>;

// Fallback title for a note saved without one.
export const UNTITLED = "Untitled note";

// Trims, drops blanks, and de-duplicates a tag list (case-insensitive),
// preserving the first-seen casing and order.
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

// Returns the title to display, falling back to the placeholder when blank.
export function displayTitle(title: string): string {
  return title.trim() || UNTITLED;
}

// Collapses markdown body text to a plain one-line preview for note cards.
export function previewText(body: string): string {
  return body
    .replace(/[#>*_`~\-]+/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
