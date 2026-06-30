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
import { Select } from "@/components/ui/select";
import { LINKABLE_MODULES } from "@/lib/todo";
import { dateToDay } from "@/lib/money";
import { workoutSessionSchema, type WorkoutSessionInput } from "@/lib/health";
import {
  createSession,
  updateSession,
  deleteSession,
} from "@/actions/workouts";
import type { WorkoutSession } from "./workouts-section";

export type RoutineOption = { id: string; name: string };

export function WorkoutSessionModal({
  open,
  onOpenChange,
  session,
  routines,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: WorkoutSession | null;
  routines: RoutineOption[];
  today: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<WorkoutSessionInput>({
    resolver: zodResolver(workoutSessionSchema),
    defaultValues: {
      date: today,
      routineId: null,
      name: "",
      durationMin: null,
      notes: null,
      linkedModule: null,
      linkedId: null,
      linkedLabel: null,
    },
  });

  function close() {
    setConfirmDelete(false);
    onOpenChange(false);
  }

  useEffect(() => {
    if (session) {
      reset({
        date: dateToDay(session.date),
        routineId: session.routineId,
        name: session.name,
        durationMin: session.durationMin,
        notes: session.notes,
        linkedModule: session.linkedModule,
        linkedId: session.linkedId,
        linkedLabel: session.linkedLabel,
      });
    } else {
      reset({
        date: today,
        routineId: null,
        name: "",
        durationMin: null,
        notes: null,
        linkedModule: null,
        linkedId: null,
        linkedLabel: null,
      });
    }
  }, [session, today, open, reset]);

  // Picks a routine and borrows its name for the session when none is typed yet.
  function onRoutineChange(id: string) {
    setValue("routineId", id || null);
    if (id && !getValues("name").trim()) {
      const r = routines.find((x) => x.id === id);
      if (r) setValue("name", r.name);
    }
  }

  function onSubmit(values: WorkoutSessionInput) {
    startTransition(async () => {
      try {
        if (session) await updateSession(session.id, values);
        else await createSession(values);
        toast.success(session ? "Session updated" : "Session logged");
        close();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!session) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteSession(session.id);
        toast.success("Session deleted");
        close();
      } catch {
        toast.error("Could not delete session");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{session ? "Edit session" : "Log session"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                className="font-mono [color-scheme:dark]"
                {...register("date")}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="durationMin">Duration</Label>
              <div className="relative">
                <Input
                  id="durationMin"
                  type="number"
                  min="0"
                  placeholder="Optional"
                  className="pr-10 font-mono"
                  {...register("durationMin", {
                    setValueAs: (v) =>
                      v === "" || v == null ? null : Number(v),
                  })}
                />
                <span className="text-fg-4 pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-xs">
                  min
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="routineId">Routine</Label>
            <Select
              id="routineId"
              {...register("routineId")}
              onChange={(e) => onRoutineChange(e.target.value)}
            >
              <option value="">None</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Push day"
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="linkedModule">Link to</Label>
              <Select
                id="linkedModule"
                {...register("linkedModule", { setValueAs: (v) => v || null })}
              >
                <option value="">None</option>
                {LINKABLE_MODULES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="linkedLabel">Link label</Label>
              <Input
                id="linkedLabel"
                placeholder="Optional"
                {...register("linkedLabel", { setValueAs: (v) => v || null })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional"
              {...register("notes", { setValueAs: (v) => v || null })}
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {session ? (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                size="sm"
                onClick={onDelete}
                disabled={pending}
              >
                {confirmDelete ? "Delete session?" : "Delete"}
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
                {session ? "Save" : "Log"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
