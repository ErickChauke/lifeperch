"use client";

import { useEffect, useState, useTransition } from "react";
import {
  useForm,
  useFieldArray,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
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
import { mealPlanSchema, type MealPlanInput } from "@/lib/health";
import {
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
} from "@/actions/meal-plans";
import type { MealPlan } from "./meal-plans-section";

const EMPTY: MealPlanInput = {
  name: "",
  notes: null,
  active: true,
  linkedModule: null,
  linkedId: null,
  linkedLabel: null,
  slots: [
    { label: "Breakfast", options: [{ name: "", calories: null, notes: null }] },
  ],
};

// Editor for one slot's swappable options. A nested field array so options can be
// added and removed without disturbing the rest of the plan.
function SlotEditor({
  control,
  register,
  index,
  onRemove,
}: {
  control: Control<MealPlanInput>;
  register: UseFormRegister<MealPlanInput>;
  index: number;
  onRemove: () => void;
}) {
  const options = useFieldArray({
    control,
    name: `slots.${index}.options`,
  });

  return (
    <div className="bg-surface-2 space-y-2 rounded-[var(--r)] border p-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Slot, e.g. Breakfast"
          className="font-medium"
          {...register(`slots.${index}.label`)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label="Remove slot"
        >
          <Trash2 />
        </Button>
      </div>

      <div className="space-y-2">
        {options.fields.map((opt, j) => (
          <div key={opt.id} className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder="Option, e.g. Oats with banana"
              {...register(`slots.${index}.options.${j}.name`)}
            />
            <Input
              className="w-20 font-mono"
              type="number"
              min="0"
              placeholder="kcal"
              {...register(`slots.${index}.options.${j}.calories`, {
                setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
              })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => options.remove(j)}
              disabled={options.fields.length === 1}
              aria-label="Remove option"
            >
              <X />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => options.append({ name: "", calories: null, notes: null })}
      >
        <Plus /> Add option
      </Button>
    </div>
  );
}

export function MealPlanModal({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MealPlan | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<MealPlanInput>({
    resolver: zodResolver(mealPlanSchema),
    defaultValues: EMPTY,
  });
  const slots = useFieldArray({ control, name: "slots" });

  function close() {
    setConfirmDelete(false);
    onOpenChange(false);
  }

  // Loads the selected plan into the form, or resets to a one-slot skeleton.
  useEffect(() => {
    if (plan) {
      reset({
        name: plan.name,
        notes: plan.notes,
        active: plan.active,
        linkedModule: plan.linkedModule,
        linkedId: plan.linkedId,
        linkedLabel: plan.linkedLabel,
        slots: plan.slots.map((s) => ({
          label: s.label,
          options: s.options.map((o) => ({
            name: o.name,
            calories: o.calories,
            notes: o.notes,
          })),
        })),
      });
    } else {
      reset(EMPTY);
    }
  }, [plan, open, reset]);

  function onSubmit(values: MealPlanInput) {
    startTransition(async () => {
      try {
        if (plan) await updateMealPlan(plan.id, values);
        else await createMealPlan(values);
        toast.success(plan ? "Plan updated" : "Plan added");
        close();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!plan) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteMealPlan(plan.id);
        toast.success("Plan deleted");
        close();
      } catch {
        toast.error("Could not delete plan");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{plan ? "Edit meal plan" : "New meal plan"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Cutting week"
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Slots</Label>
            {slots.fields.map((field, i) => (
              <SlotEditor
                key={field.id}
                control={control}
                register={register}
                index={i}
                onRemove={() => slots.remove(i)}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                slots.append({
                  label: "",
                  options: [{ name: "", calories: null, notes: null }],
                })
              }
            >
              <Plus /> Add slot
            </Button>
            {errors.slots ? (
              <p className="text-destructive text-xs">
                Every slot needs a label and every option a name.
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
            {plan ? (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                size="sm"
                onClick={onDelete}
                disabled={pending}
              >
                {confirmDelete ? "Delete plan?" : "Delete"}
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
                {plan ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
