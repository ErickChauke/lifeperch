import { getEvents } from "@/actions/timetable";
import { TimetableBoard } from "@/components/modules/timetable/timetable-board";

// Timetable page. Fetches the user's events and hands them to the board.
export default async function TimetablePage() {
  const events = await getEvents();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-semibold tracking-[-0.01em]">Timetable</h2>
        <p className="text-fg-2 mt-1 text-sm">
          Your weekly lectures and shifts.
        </p>
      </div>
      <TimetableBoard events={events} />
    </div>
  );
}
