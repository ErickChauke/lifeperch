"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
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
import { workoutRoutineSchema, type WorkoutRoutineInput } from "@/lib/health";
import {
  createRoutine,
  updateRoutine,
  deleteRoutine,
} from "@/actions/workouts";
import type { Routine } from "./workouts-section";

const EMPTY: WorkoutRoutineInput = {
  name: "",
  notes: null,
  active: true,
  linkedModule: null,
  linkedId: null,
  linkedLabel: null,
  exercises: [{ name: "", sets: null, reps: null, weight: null, notes: null }],
};

const num = (v: string) => (v === "" || v == null ? null : Number(v));

export function WorkoutRoutineModal({
  open,
  onOpenChange,
  routine,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine: Routine | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<WorkoutRoutineInput>({
    resolver: zodResolver(workoutRoutineSchema),
    defaultValues: EMPTY,
  });
  const exercises = useFieldArray({ control, name: "exercises" });

  function close() {
    setConfirmDelete(false);
    onOpenChange(false);
  }

  useEffect(() => {
    if (routine) {
      reset({
        name: routine.name,
        notes: routine.notes,
        active: routine.active,
        linkedModule: routine.linkedModule,
        linkedId: routine.linkedId,
        linkedLabel: routine.linkedLabel,
        exercises: routine.exercises.map((e) => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          notes: e.notes,
        })),
      });
    } else {
      reset(EMPTY);
    }
  }, [routine, open, reset]);

  function onSubmit(values: WorkoutRoutineInput) {
    startTransition(async () => {
      try {
        if (routine) await updateRoutine(routine.id, values);
        else await createRoutine(values);
        toast.success(routine ? "Routine updated" : "Routine added");
        close();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!routine) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteRoutine(routine.id);
        toast.success("Routine deleted");
        close();
      } catch {
        toast.error("Could not delete routine");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{routine ? "Edit routine" : "New routine"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. Push day" {...register("name")} />
            {errors.name ? (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Exercises</Label>
            <div className="space-y-2">
              {exercises.fields.map((field, i) => (
                <div
                  key={field.id}
                  className="bg-surface-2 flex items-center gap-2 rounded-[var(--r)] border p-2"
                >
                  <Input
                    className="flex-1"
                    placeholder="Exercise"
                    {...register(`exercises.${i}.name`)}
                  />
                  <Input
                    className="w-14 font-mono"
                    type="number"
                    min="0"
                    placeholder="sets"
                    {...register(`exercises.${i}.sets`, { setValueAs: num })}
                  />
                  <Input
                    className="w-14 font-mono"
                    type="number"
                    min="0"
                    placeholder="reps"
                    {...register(`exercises.${i}.reps`, { setValueAs: num })}
                  />
                  <Input
                    className="w-16 font-mono"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="kg"
                    {...register(`exercises.${i}.weight`, { setValueAs: num })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => exercises.remove(i)}
                    disabled={exercises.fields.length === 1}
                    aria-label="Remove exercise"
                  >
                    <X />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                exercises.append({
                  name: "",
                  sets: null,
                  reps: null,
                  weight: null,
                  notes: null,
                })
              }
            >
              <Plus /> Add exercise
            </Button>
            {errors.exercises ? (
              <p className="text-destructive text-xs">
                Every exercise needs a name.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional"
              {...register("notes", { setValueAs: (v) => v || null })}
            />
          </div>

          <label className="text-fg-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-[var(--accent)]"
              {...register("active")}
            />
            Active
          </label>

          <div className="flex items-center justify-between gap-2 pt-2">
            {routine ? (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                size="sm"
                onClick={onDelete}
                disabled={pending}
              >
                {confirmDelete ? "Delete routine?" : "Delete"}
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
                {routine ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
