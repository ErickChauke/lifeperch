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
import { goalSchema, monthsToGoal, type GoalInput } from "@/lib/goals";
import { randToCents, centsToRand } from "@/lib/money";
import { createGoal, updateGoal, deleteGoal } from "@/actions/goals";
import type { Goal } from "./goals-board";

const EMPTY: GoalInput = { name: "", target: 0, current: 0, monthly: 0 };

// A money field with a leading R adornment, registered as a number.
function MoneyField({
  id,
  label,
  register,
  error,
}: {
  id: string;
  label: string;
  register: ReturnType<typeof useForm<GoalInput>>["register"];
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 font-mono text-sm">
          R
        </span>
        <Input
          id={id}
          type="number"
          step="0.01"
          min="0"
          className="pl-7 font-mono"
          {...register(id as keyof GoalInput, { valueAsNumber: true })}
        />
      </div>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

export function GoalModal({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: EMPTY,
  });

  const target = watch("target");
  const current = watch("current");
  const monthly = watch("monthly");
  const eta = monthsToGoal(
    randToCents(current || 0),
    randToCents(target || 0),
    randToCents(monthly || 0),
  );

  useEffect(() => {
    setConfirmDelete(false);
    if (goal) {
      reset({
        name: goal.name,
        target: centsToRand(goal.targetAmount),
        current: centsToRand(goal.currentAmount),
        monthly: centsToRand(goal.monthlyAmount),
      });
    } else {
      reset(EMPTY);
    }
  }, [goal, open, reset]);

  function onSubmit(values: GoalInput) {
    startTransition(async () => {
      try {
        if (goal) await updateGoal(goal.id, values);
        else await createGoal(values);
        toast.success(goal ? "Goal updated" : "Goal added");
        onOpenChange(false);
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!goal) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteGoal(goal.id);
        toast.success("Goal deleted");
        onOpenChange(false);
      } catch {
        toast.error("Could not delete goal");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit goal" : "New goal"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. Emergency fund" {...register("name")} />
            {errors.name ? (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            ) : null}
          </div>

          <MoneyField id="target" label="Target" register={register} error={errors.target?.message} />
          <MoneyField id="current" label="Saved so far" register={register} error={errors.current?.message} />
          <MoneyField id="monthly" label="Monthly contribution" register={register} error={errors.monthly?.message} />

          {eta !== null && eta > 0 ? (
            <p className="text-fg-3 font-mono text-xs">≈ {eta} months to reach it</p>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-2">
            {goal ? (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                size="sm"
                onClick={onDelete}
                disabled={pending}
              >
                {confirmDelete ? "Delete goal?" : "Delete"}
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
                {goal ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
