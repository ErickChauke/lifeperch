import type { ReactNode } from "react";

// Minimal, safe markdown renderer for the note preview. Supports headings,
// unordered lists, fenced code blocks, paragraphs, and inline bold/italic/code
// and links. Renders to React nodes (never raw HTML), so note content cannot
// inject markup.

// Allows only http(s), root-relative, and anchor links.
function sanitizeHref(href: string): string | null {
  const h = href.trim();
  if (/^https?:\/\//i.test(h) || h.startsWith("/") || h.startsWith("#")) return h;
  return null;
}

const INLINE =
  /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;

// Parses inline spans within a single block of text.
function inline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[2] !== undefined) nodes.push(<strong key={key}>{m[2]}</strong>);
    else if (m[3] !== undefined) nodes.push(<em key={key}>{m[3]}</em>);
    else if (m[4] !== undefined)
      nodes.push(
        <code
          key={key}
          className="bg-surface-2 rounded px-1 py-0.5 font-mono text-[0.85em]"
        >
          {m[4]}
        </code>,
      );
    else if (m[5] !== undefined) {
      const href = sanitizeHref(m[6]);
      nodes.push(
        href ? (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-accent-read underline underline-offset-2"
          >
            {m[5]}
          </a>
        ) : (
          m[5]
        ),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];
  let key = 0;
  let i = 0;

  function flushPara() {
    if (!para.length) return;
    blocks.push(
      <p key={`p${key}`} className="text-fg leading-relaxed">
        {inline(para.join(" "), `p${key++}`)}
      </p>,
    );
    para = [];
  }
  function flushList() {
    if (!list.length) return;
    const items = list;
    blocks.push(
      <ul
        key={`u${key}`}
        className="text-fg list-disc space-y-1 pl-5 leading-relaxed"
      >
        {items.map((li, idx) => (
          <li key={idx}>{inline(li, `u${key}-${idx}`)}</li>
        ))}
      </ul>,
    );
    key++;
    list = [];
  }

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      flushPara();
      flushList();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(
        <pre
          key={`c${key++}`}
          className="bg-surface-2 overflow-x-auto rounded-md p-3 font-mono text-sm"
        >
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      flushList();
      const level = heading[1].length;
      const cls =
        level === 1
          ? "text-fg text-xl font-semibold"
          : level === 2
            ? "text-fg text-lg font-semibold"
            : "text-fg text-base font-semibold";
      blocks.push(
        <p key={`h${key}`} className={cls}>
          {inline(heading[2], `h${key++}`)}
        </p>,
      );
      i++;
      continue;
    }
    const li = /^[-*]\s+(.*)$/.exec(line);
    if (li) {
      flushPara();
      list.push(li[1]);
      i++;
      continue;
    }
    if (line.trim() === "") {
      flushPara();
      flushList();
      i++;
      continue;
    }
    para.push(line.trim());
    i++;
  }
  flushPara();
  flushList();

  return <div className="space-y-3">{blocks}</div>;
}
