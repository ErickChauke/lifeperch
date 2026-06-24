import { Markdown } from "./markdown";

// Renders a rich-text body for reading, shared across modules. Rich html bodies
// (sanitized on save) render in a prose container styled to the app tokens;
// legacy markdown/plain bodies render through the safe markdown component.
export function RichContent({
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
