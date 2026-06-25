"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  eventSchema,
  EVENT_TYPES,
  WEEKDAYS,
  type EventInput,
} from "@/lib/timetable";
import { createEvent, updateEvent, deleteEvent } from "@/actions/timetable";
import type { TimetableEvent } from "./timetable-board";

const EMPTY: EventInput = {
  title: "",
  type: "" as EventInput["type"],
  startTime: "09:00",
  endTime: "10:00",
  isRecurring: true,
  dayOfWeek: 0,
  specificDate: null,
  location: null,
  notes: null,
};

export function EventModal({
  open,
  onOpenChange,
  event,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: TimetableEvent | null;
}) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: EMPTY,
  });

  const isRecurring = watch("isRecurring");

  // Loads the selected event into the form, or resets to empty for add.
  useEffect(() => {
    if (event) {
      reset({
        title: event.title,
        type: event.type as EventInput["type"],
        startTime: event.startTime,
        endTime: event.endTime,
        isRecurring: event.isRecurring,
        dayOfWeek: event.dayOfWeek,
        specificDate: event.specificDate
          ? format(new Date(event.specificDate), "yyyy-MM-dd")
          : null,
        location: event.location,
        notes: event.notes,
      });
    } else {
      reset(EMPTY);
    }
  }, [event, open, reset]);

  function onSubmit(values: EventInput) {
    startTransition(async () => {
      try {
        if (event) await updateEvent(event.id, values);
        else await createEvent(values);
        toast.success(event ? "Event updated" : "Event added");
        onOpenChange(false);
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!event) return;
    startTransition(async () => {
      try {
        await deleteEvent(event.id);
        toast.success("Event deleted");
        onOpenChange(false);
      } catch {
        toast.error("Could not delete event");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "Add event"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title ? (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <Select id="type" placeholder="Select a type" {...register("type")}>
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            {errors.type ? (
              <p className="text-destructive text-xs">{errors.type.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Start</Label>
              <Input id="startTime" type="time" {...register("startTime")} />
              {errors.startTime ? (
                <p className="text-destructive text-xs">
                  {errors.startTime.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">End</Label>
              <Input id="endTime" type="time" {...register("endTime")} />
              {errors.endTime ? (
                <p className="text-destructive text-xs">
                  {errors.endTime.message}
                </p>
              ) : null}
            </div>
          </div>

          <Label className="gap-2">
            <input type="checkbox" {...register("isRecurring")} />
            Repeats weekly
          </Label>

          {isRecurring ? (
            <div className="space-y-1.5">
              <Label htmlFor="dayOfWeek">Day</Label>
              <Select
                id="dayOfWeek"
                {...register("dayOfWeek", {
                  setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                })}
              >
                {WEEKDAYS.map((day, i) => (
                  <option key={day} value={i}>
                    {day}
                  </option>
                ))}
              </Select>
              {errors.dayOfWeek ? (
                <p className="text-destructive text-xs">
                  {errors.dayOfWeek.message}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="specificDate">Date</Label>
              <Input
                id="specificDate"
                type="date"
                {...register("specificDate", {
                  setValueAs: (v) => v || null,
                })}
              />
              {errors.specificDate ? (
                <p className="text-destructive text-xs">
                  {errors.specificDate.message}
                </p>
              ) : null}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...register("location", { setValueAs: (v) => v || null })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes", { setValueAs: (v) => v || null })}
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {event ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onDelete}
                disabled={pending}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {event ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
