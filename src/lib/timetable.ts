import { getDay } from "date-fns";
import { z } from "zod";

// Event types and their fixed palette colors. The color is derived from the
// type, so the form never asks for a color directly.
export const EVENT_TYPES = [
  { value: "lecture", label: "Lecture", color: "#378ADD" },
  { value: "work", label: "Work", color: "#E67E22" },
  { value: "lab", label: "Lab", color: "#16A34A" },
  { value: "personal", label: "Personal", color: "#9333EA" },
  { value: "other", label: "Other", color: "#64748B" },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]["value"];

const EVENT_TYPE_VALUES = EVENT_TYPES.map((t) => t.value) as [
  EventType,
  ...EventType[],
];

// Returns the palette color for a type, falling back to the lecture blue.
export function typeColor(type: string): string {
  return EVENT_TYPES.find((t) => t.value === type)?.color ?? "#378ADD";
}

// Weekday labels, Monday first. Index matches the dayOfWeek convention below.
export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

// App convention: dayOfWeek 0 = Monday ... 6 = Sunday.
// date-fns getDay is 0 = Sunday, so shift it into the Monday-first index.
export function weekdayIndex(date: Date): number {
  return (getDay(date) + 6) % 7;
}

// Hour range shown in the week grid.
export const GRID_START_HOUR = 6;
export const GRID_END_HOUR = 22;

// Converts an "HH:MM" string to minutes since midnight.
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

const timeRegex = /^\d{2}:\d{2}$/;

// Shared validation for the event form and the server actions.
export const eventSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    type: z.enum(EVENT_TYPE_VALUES),
    startTime: z.string().regex(timeRegex, "Use HH:MM"),
    endTime: z.string().regex(timeRegex, "Use HH:MM"),
    isRecurring: z.boolean(),
    dayOfWeek: z.number().int().min(0).max(6).nullable(),
    specificDate: z.string().nullable(),
    location: z.string().nullable(),
    notes: z.string().nullable(),
  })
  .refine((d) => timeToMinutes(d.endTime) > timeToMinutes(d.startTime), {
    message: "End time must be after start time",
    path: ["endTime"],
  })
  .refine((d) => (d.isRecurring ? d.dayOfWeek !== null : true), {
    message: "Pick a day of the week",
    path: ["dayOfWeek"],
  })
  .refine((d) => (d.isRecurring ? true : !!d.specificDate), {
    message: "Pick a date",
    path: ["specificDate"],
  });

export type EventInput = z.infer<typeof eventSchema>;
