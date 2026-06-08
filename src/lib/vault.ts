import { z } from "zod";

// Document categories for the vault (per the design spec).
export const DOCUMENT_CATEGORIES = [
  "ID & Legal",
  "Finance",
  "Property",
  "Medical",
  "Education",
  "Other",
] as const;

// Validation for creating a document. The upload fields come from the signed
// browser upload, so the form itself only supplies title and category.
export const documentSchema = z.object({
  title: z.string().min(1, "Name the document"),
  category: z.string().min(1, "Pick a category"),
  url: z.string().url(),
  publicId: z.string().min(1),
  format: z.string().nullable().optional(),
  bytes: z.number().nullable().optional(),
});

export type DocumentInput = z.infer<typeof documentSchema>;

// Buckets a file format/extension into a coarse kind, used to pick the card icon.
export function fileKind(format: string | null): "pdf" | "image" | "sheet" | "archive" | "file" {
  const f = (format ?? "").toLowerCase();
  if (f === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "heic", "svg"].includes(f)) return "image";
  if (["csv", "xls", "xlsx", "numbers"].includes(f)) return "sheet";
  if (["zip", "rar", "7z", "tar", "gz"].includes(f)) return "archive";
  if (["doc", "docx", "txt", "rtf", "pages"].includes(f)) return "pdf";
  return "file";
}

// Formats a byte count as a compact human size (e.g. "1.2 MB").
export function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
