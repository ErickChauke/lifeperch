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
    <div className="space-y-4">
      <div className="flex justify-end">
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
