import { marked } from "marked";
import { z } from "zod";

// Shared validation for the note form and the server actions. Title may be left
// blank in the editor; the action falls back to a placeholder so every note has
// a usable card label. bodyFormat marks whether body is legacy markdown or the
// rich editor's html.
export const noteSchema = z.object({
  title: z.string(),
  body: z.string().max(100000),
  bodyFormat: z.enum(["markdown", "html"]),
  tags: z.array(z.string()),
});

export type NoteInput = z.infer<typeof noteSchema>;

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

// Collapses rich html body text to a plain one-line preview for note cards.
// Strips tags and decodes the few entities marked output commonly emits.
export function htmlPreview(body: string): string {
  return body
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Best-effort markdown to html for seeding the editor from a legacy note. Tiptap
// re-parses the result into its own schema, and the eventual save is sanitized
// server-side, so no sanitizing happens here.
export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false });
}
