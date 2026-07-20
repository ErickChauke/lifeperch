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
import { goalSchema, formatEta, type GoalInput } from "@/lib/goals";
import { monthsToClear } from "@/lib/extra";
import { randToCents, centsToRand, stripNegative, dayToDate, dateToDay } from "@/lib/money";
import { ExtraFields } from "./extra-fields";
import { MAX_AMOUNT } from "@/lib/currency";
import { createGoal, updateGoal, deleteGoal } from "@/actions/goals";
import type { Goal } from "./goals-board";

const EMPTY: GoalInput = {
  name: "",
  target: 0,
  current: 0,
  monthly: 0,
  extraAmount: 0,
  extraFrequency: "month",
  extraDate: "",
};

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
  const reg = register(id as keyof GoalInput, { valueAsNumber: true });
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
          max={MAX_AMOUNT}
          className="pl-7 font-mono"
          {...reg}
          onChange={(e) => {
            e.target.value = stripNegative(e.target.value);
            reg.onChange(e);
          }}
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
  const extraAmount = watch("extraAmount");
  const extraFrequency = watch("extraFrequency");
  const extraDate = watch("extraDate");
  const targetCents = randToCents(Number(target) || 0);
  const currentCents = randToCents(Number(current) || 0);
  const eta =
    targetCents > 0
      ? monthsToClear(targetCents - currentCents, randToCents(Number(monthly) || 0), {
          extraAmount: randToCents(Number(extraAmount) || 0),
          extraFrequency,
          extraDate: extraDate ? dayToDate(extraDate) : null,
        })
      : null;

  useEffect(() => {
    setConfirmDelete(false);
    if (goal) {
      reset({
        name: goal.name,
        target: centsToRand(goal.targetAmount),
        current: centsToRand(goal.currentAmount),
        monthly: centsToRand(goal.monthlyAmount),
        extraAmount: centsToRand(goal.extraAmount),
        extraFrequency: (goal.extraFrequency as GoalInput["extraFrequency"]) ?? "month",
        extraDate: goal.extraDate ? dateToDay(goal.extraDate) : "",
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

          <ExtraFields
            amount={register("extraAmount", { valueAsNumber: true })}
            frequency={register("extraFrequency")}
            date={register("extraDate")}
            cadence={extraFrequency}
            hint="Anything you put in beyond the monthly amount, like R50 a day, or a payment you are expecting on a date."
          />

          {eta !== null && eta > 0 ? (
            <p className="text-fg-3 font-mono text-xs">≈ {formatEta(eta)} to reach it</p>
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
