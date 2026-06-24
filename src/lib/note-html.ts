import "server-only";
import sanitizeHtml from "sanitize-html";

// Allows only http(s), root-relative, and anchor links (mirrors sanitizeHref in
// the markdown renderer).
function safeHref(href: string): boolean {
  const h = href.trim();
  return /^https?:\/\//i.test(h) || h.startsWith("/") || h.startsWith("#");
}

// Sanitizes rich note html before it is stored. Allows the small set of tags the
// editor produces (headings, lists, tables, task checkboxes, quotes, code) and
// drops everything else, including scripts and event handlers. Runs server-side
// only so sanitize-html never reaches the browser bundle.
export function sanitizeNoteHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "p",
      "br",
      "hr",
      "strong",
      "em",
      "s",
      "code",
      "pre",
      "blockquote",
      "ul",
      "ol",
      "li",
      "a",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "input",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      input: ["type", "checked", "disabled"],
      // Tiptap task-list markup carries inert data hooks used to round-trip the
      // checked state and to style the list; keep only those.
      ul: ["data-type"],
      li: ["data-type", "data-checked"],
    },
    allowedSchemes: ["http", "https"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        if (!attribs.href || !safeHref(attribs.href)) {
          const next = { ...attribs };
          delete next.href;
          return { tagName, attribs: next };
        }
        return {
          tagName,
          attribs: { ...attribs, target: "_blank", rel: "noreferrer" },
        };
      },
      // Task checkboxes are display only when rendered outside the editor.
      input: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, type: "checkbox", disabled: "disabled" },
      }),
    },
  });
}
