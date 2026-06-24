import { marked } from "marked";
import { z } from "zod";

// Shared helpers for rich-text bodies across modules (notes, journal,
// literature). A body is either legacy "markdown" (plain text or markdown
// written before the rich editor) or "html" produced by the rich editor and
// sanitized server-side on save.

// Upper bound on a stored rich body, shared by the per-module zod schemas.
export const RICH_BODY_MAX = 100000;

// The format discriminator stored alongside a rich body.
export const bodyFormatSchema = z.enum(["markdown", "html"]);
export type BodyFormat = z.infer<typeof bodyFormatSchema>;

// Collapses rich html to a plain one-line preview for cards and lists. Strips
// tags and decodes the few entities marked output commonly emits.
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

// Best-effort markdown (or plain text) to html for seeding the editor from a
// legacy body. Tiptap re-parses the result into its own schema, and the eventual
// save is sanitized server-side, so no sanitizing happens here.
export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false });
}

// Returns the html used to seed the rich editor for a body: html bodies pass
// through, legacy bodies are converted best-effort.
export function seedHtml(body: string, bodyFormat: string): string {
  return bodyFormat === "html" ? body : markdownToHtml(body);
}
