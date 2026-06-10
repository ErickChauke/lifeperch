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
import { Select } from "@/components/ui/select";
import { mealSchema, MEAL_TYPES, MEAL_TYPE_META, type MealInput, type MealType } from "@/lib/health";
import { createMeal, updateMeal, deleteMeal } from "@/actions/health";
import type { Meal } from "./health-board";

export function MealModal({
  open,
  onOpenChange,
  meal,
  date,
  defaultType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: Meal | null;
  date: string;
  defaultType: MealType;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MealInput>({
    resolver: zodResolver(mealSchema),
    defaultValues: { date, type: defaultType, name: "", time: null, calories: null },
  });

  // Resets the confirm flag and closes; routed through every close path so a
  // pending delete-confirm never survives a reopen.
  function close() {
    setConfirmDelete(false);
    onOpenChange(false);
  }

  // Loads the selected meal, or resets to a blank meal pre-set to the day and the
  // group it was opened from (with that type's sensible clock time).
  useEffect(() => {
    if (meal) {
      reset({
        date,
        type: meal.type as MealType,
        name: meal.name,
        time: meal.time,
        calories: meal.calories,
      });
    } else {
      reset({
        date,
        type: defaultType,
        name: "",
        time: MEAL_TYPE_META[defaultType].defaultTime,
        calories: null,
      });
    }
  }, [meal, date, defaultType, open, reset]);

  function onSubmit(values: MealInput) {
    startTransition(async () => {
      try {
        if (meal) await updateMeal(meal.id, values);
        else await createMeal(values);
        toast.success(meal ? "Meal updated" : "Meal added");
        close();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!meal) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteMeal(meal.id);
        toast.success("Meal deleted");
        close();
      } catch {
        toast.error("Could not delete meal");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{meal ? "Edit meal" : "Add meal"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <Select id="type" {...register("type")}>
              {MEAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {MEAL_TYPE_META[t].label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. Oats with banana" {...register("name")} />
            {errors.name ? (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                className="font-mono [color-scheme:dark]"
                {...register("time", { setValueAs: (v) => v || null })}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="calories">Calories</Label>
              <div className="relative">
                <Input
                  id="calories"
                  type="number"
                  min="0"
                  placeholder="Optional"
                  className="pr-10 font-mono"
                  {...register("calories", {
                    setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                  })}
                />
                <span className="text-fg-4 pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-xs">
                  kcal
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {meal ? (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                size="sm"
                onClick={onDelete}
                disabled={pending}
              >
                {confirmDelete ? "Delete meal?" : "Delete"}
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
                {meal ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
