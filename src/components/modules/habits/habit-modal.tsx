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
import { HabitIcon } from "./habit-icon";
import { habitSchema, HABIT_ICONS, type HabitInput } from "@/lib/habits";
import { createHabit, updateHabit, archiveHabit } from "@/actions/habits";
import type { Habit } from "./habits-board";

const KINDS = [
  { value: "none", label: "None" },
  { value: "count", label: "Countable" },
] as const;

function emptyValues(): HabitInput {
  return {
    name: "",
    description: null,
    kind: "none",
    target: 1,
    unit: null,
    icon: null,
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

  // Resets the confirm flag and closes; routed through every close path so a
  // pending archive-confirm never survives a reopen.
  function close() {
    setConfirmArchive(false);
    onOpenChange(false);
  }

  // Loads the selected habit into the form, or resets to a blank boolean habit.
  useEffect(() => {
    if (habit) {
      reset({
        name: habit.name,
        description: habit.description,
        // Legacy "boolean" habits map to the simple check-off kind.
        kind: habit.kind === "count" ? "count" : "none",
        target: habit.target,
        unit: habit.unit,
        icon: habit.icon,
      });
    } else {
      reset(emptyValues());
    }
  }, [habit, open, reset]);

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
