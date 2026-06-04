import type { TimetableEvent } from "./timetable-board";

// A single event block in the week grid. Background and accent come from the
// stored palette color, so an inline style is used for those runtime values.
export function EventCard({
  event,
  onClick,
}: {
  event: TimetableEvent;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-full w-full overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left transition-opacity hover:opacity-80"
      style={{ backgroundColor: `${event.color}1a`, borderColor: event.color }}
    >
      <p className="truncate text-xs font-medium" style={{ color: event.color }}>
        {event.title}
      </p>
      <p className="text-muted-foreground truncate text-[11px]">
        {event.startTime}-{event.endTime}
      </p>
      {event.location ? (
        <p className="text-muted-foreground truncate text-[11px]">
          {event.location}
        </p>
      ) : null}
    </button>
  );
}
