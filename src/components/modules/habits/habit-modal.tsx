"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Segmented } from "@/components/modules/money/segmented";
import { WEEKDAYS, weekdayIndex } from "@/lib/timetable";
import { HabitIcon } from "./habit-icon";
import {
  habitSchema,
  frequencyMode,
  HABIT_ICONS,
  type HabitInput,
  type FrequencyMode,
} from "@/lib/habits";
import { createHabit, updateHabit, archiveHabit } from "@/actions/habits";
import type { Habit } from "./habits-board";

const KINDS = [
  { value: "none", label: "None" },
  { value: "count", label: "Countable" },
] as const;

const FREQS = [
  { value: "daily", label: "Every day" },
  { value: "days", label: "Days" },
  { value: "weekly", label: "Weekly" },
] as const;

function emptyValues(): HabitInput {
  return {
    name: "",
    description: null,
    kind: "none",
    target: 1,
    unit: null,
    icon: null,
    daysOfWeek: [],
    weeklyTarget: null,
    startTime: null,
    endTime: null,
    startDate: null,
    linkedModule: null,
    linkedId: null,
    linkedLabel: null,
  };
}

export function HabitModal({
  open,
  onOpenChange,
  habit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit: Habit | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [freq, setFreq] = useState<FrequencyMode>("daily");
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<HabitInput>({
    resolver: zodResolver(habitSchema),
    defaultValues: emptyValues(),
  });

  const kind = watch("kind");
  const icon = watch("icon");
  const days = watch("daysOfWeek");
  const startTime = watch("startTime");

  function close() {
    setConfirmArchive(false);
    onOpenChange(false);
  }

  // Loads the selected habit into the form, or resets to a blank daily habit.
  useEffect(() => {
    if (habit) {
      reset({
        name: habit.name,
        description: habit.description,
        kind: habit.kind === "count" ? "count" : "none",
        target: habit.target,
        unit: habit.unit,
        icon: habit.icon,
        daysOfWeek: habit.daysOfWeek,
        weeklyTarget: habit.weeklyTarget,
        startTime: habit.startTime,
        endTime: habit.endTime,
        startDate: habit.startDate
          ? habit.startDate.toISOString().slice(0, 10)
          : null,
        linkedModule: habit.linkedModule,
        linkedId: habit.linkedId,
        linkedLabel: habit.linkedLabel,
      });
      setFreq(frequencyMode(habit));
    } else {
      reset(emptyValues());
      setFreq("daily");
    }
  }, [habit, open, reset]);

  // Switches cadence, clearing the fields the other modes do not use.
  function applyFreq(mode: FrequencyMode) {
    setFreq(mode);
    if (mode === "daily") {
      setValue("daysOfWeek", []);
      setValue("weeklyTarget", null);
    } else if (mode === "days") {
      setValue("weeklyTarget", null);
      if (!watch("daysOfWeek")?.length) {
        setValue("daysOfWeek", [weekdayIndex(new Date())]);
      }
    } else {
      setValue("daysOfWeek", []);
      setValue("weeklyTarget", watch("weeklyTarget") ?? 3);
    }
  }

  function toggleDay(d: number) {
    const set = new Set(days ?? []);
    if (set.has(d)) set.delete(d);
    else set.add(d);
    setValue("daysOfWeek", [...set]);
  }

  function toggleTimed(on: boolean) {
    if (on) {
      setValue("startTime", "09:00");
    } else {
      setValue("startTime", null);
      setValue("endTime", null);
    }
  }

  function onSubmit(values: HabitInput) {
    startTransition(async () => {
      try {
        if (habit) await updateHabit(habit.id, values);
        else await createHabit(values);
        toast.success(habit ? "Habit updated" : "Habit added");
        close();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onArchive() {
    if (!habit) return;
    if (!confirmArchive) {
      setConfirmArchive(true);
      return;
    }
    startTransition(async () => {
      try {
        await archiveHabit(habit.id);
        toast.success("Habit archived");
        close();
      } catch {
        toast.error("Could not archive habit");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{habit ? "Edit habit" : "Add habit"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. Drink water" {...register("name")} />
            {errors.name ? (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What this habit is about (optional)"
              {...register("description", { setValueAs: (v) => v || null })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Segmented options={KINDS} value={kind} onChange={(v) => setValue("kind", v)} />
            <p className="text-fg-4 font-mono text-xs">
              {kind === "count" ? "Count toward a daily target" : "A simple done / not-done"}
            </p>
          </div>

          {kind === "count" ? (
            <div className="flex gap-3">
              <div className="w-[120px] space-y-1.5">
                <Label htmlFor="target">Target</Label>
                <Input
                  id="target"
                  type="number"
                  min="1"
                  className="font-mono"
                  {...register("target", { valueAsNumber: true })}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  placeholder="e.g. glasses"
                  {...register("unit", { setValueAs: (v) => v || null })}
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <Segmented<FrequencyMode>
              options={FREQS}
              value={freq}
              onChange={applyFreq}
            />
            {freq === "days" ? (
              <div className="flex gap-1 pt-1">
                {WEEKDAYS.map((name, i) => {
                  const on = (days ?? []).includes(i);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={cn(
                        "flex-1 rounded-[var(--r-sm)] border py-1.5 text-xs font-medium transition-colors",
                        on
                          ? "border-accent-line text-accent-read bg-accent-soft"
                          : "border-border text-fg-3 hover:text-fg-2",
                      )}
                    >
                      {name.slice(0, 2)}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {freq === "weekly" ? (
              <div className="flex items-center gap-2 pt-1">
                <Input
                  type="number"
                  min="1"
                  max="7"
                  className="w-[80px] font-mono"
                  {...register("weeklyTarget", {
                    setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                  })}
                />
                <span className="text-fg-3 text-sm">times per week</span>
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!startTime}
                onChange={(e) => toggleTimed(e.target.checked)}
              />
              Set a time
            </label>
            {startTime ? (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  className="w-[130px] font-mono"
                  {...register("startTime", { setValueAs: (v) => v || null })}
                />
                <span className="text-fg-4">to</span>
                <Input
                  type="time"
                  className="w-[130px] font-mono"
                  {...register("endTime", { setValueAs: (v) => v || null })}
                />
              </div>
            ) : null}
            {errors.endTime ? (
              <p className="text-destructive text-xs">{errors.endTime.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="startDate">Start date</Label>
            <Input
              id="startDate"
              type="date"
              className="w-[170px] font-mono"
              {...register("startDate", { setValueAs: (v) => v || null })}
            />
            <p className="text-fg-4 font-mono text-xs">
              Leave blank to track from the first check-in.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {HABIT_ICONS.map((name) => {
                const selected = icon === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setValue("icon", selected ? null : name)}
                    className={cn(
                      "bg-surface-2 text-fg-2 flex size-10 items-center justify-center rounded-[var(--r-sm)] border transition-colors",
                      selected ? "border-accent-line text-accent-read" : "border-transparent hover:text-fg",
                    )}
                  >
                    <HabitIcon name={name} className="size-[18px]" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {habit ? (
              <Button
                type="button"
                variant={confirmArchive ? "destructive" : "ghost"}
                size="sm"
                onClick={onArchive}
                disabled={pending}
              >
                {confirmArchive ? "Archive habit?" : "Archive"}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={close}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {habit ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
