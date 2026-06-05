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
      className="h-full w-full overflow-hidden rounded-[var(--r-sm)] border-l-[3px] px-1.5 py-1 text-left transition-opacity hover:opacity-80"
      style={{ backgroundColor: `${event.color}1a`, borderColor: event.color }}
    >
      <p className="truncate text-xs font-medium" style={{ color: event.color }}>
        {event.title}
      </p>
      <p className="text-fg-3 truncate font-mono text-[11px]">
        {event.startTime}–{event.endTime}
      </p>
      {event.location ? (
        <p className="text-fg-3 truncate text-[11px]">{event.location}</p>
      ) : null}
    </button>
  );
}
