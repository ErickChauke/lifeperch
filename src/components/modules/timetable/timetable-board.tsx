"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeekView } from "./week-view";
import { EventModal } from "./event-modal";
import type { getEvents } from "@/actions/timetable";

export type TimetableEvent = Awaited<ReturnType<typeof getEvents>>[number];

// Client container for the timetable. Owns the add/edit modal state.
export function TimetableBoard({ events }: { events: TimetableEvent[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TimetableEvent | null>(null);

  function openAdd() {
    setSelected(null);
    setOpen(true);
  }

  function openEdit(event: TimetableEvent) {
    setSelected(event);
    setOpen(true);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 pb-8 md:px-8 md:pb-10">
      <div className="flex shrink-0 justify-end">
        <Button size="sm" onClick={openAdd}>
          <Plus />
          Add event
        </Button>
      </div>
      <WeekView events={events} onEventClick={openEdit} />
      <EventModal open={open} onOpenChange={setOpen} event={selected} />
    </div>
  );
}
