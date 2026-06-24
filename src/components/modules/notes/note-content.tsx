import { Markdown } from "./markdown";

// Renders a note body for reading. Rich html notes (sanitized on save) render in
// a prose container styled to the app tokens; legacy markdown notes render
// through the safe markdown component.
export function NoteContent({
  body,
  bodyFormat,
}: {
  body: string;
  bodyFormat: string;
}) {
  if (bodyFormat === "html") {
    return (
      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    );
  }
  return <Markdown source={body} />;
}
