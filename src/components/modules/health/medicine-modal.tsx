"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WEEKDAYS } from "@/lib/timetable";
import { cn } from "@/lib/utils";
import { medicineSchema, type MedicineInput } from "@/lib/health";
import {
  createMedicine,
  updateMedicine,
  deleteMedicine,
} from "@/actions/medicines";
import type { Medicine } from "./medicines-section";

const EMPTY: MedicineInput = {
  name: "",
  dose: null,
  schedule: null,
  times: [],
  days: [],
  active: true,
  linkedModule: null,
  linkedId: null,
  linkedLabel: null,
};

export function MedicineModal({
  open,
  onOpenChange,
  medicine,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicine: Medicine | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<MedicineInput>({
    resolver: zodResolver(medicineSchema),
    defaultValues: EMPTY,
  });

  const times = useWatch({ control, name: "times" }) ?? [];
  const days = useWatch({ control, name: "days" }) ?? [];

  function addTime() {
    setValue("times", [...times, "08:00"], { shouldDirty: true });
  }
  function setTime(i: number, v: string) {
    setValue(
      "times",
      times.map((t, idx) => (idx === i ? v : t)),
      { shouldDirty: true },
    );
  }
  function removeTime(i: number) {
    setValue(
      "times",
      times.filter((_, idx) => idx !== i),
      { shouldDirty: true },
    );
  }
  function toggleDay(d: number) {
    setValue(
      "days",
      days.includes(d) ? days.filter((x) => x !== d) : [...days, d],
      { shouldDirty: true },
    );
  }

  function close() {
    setConfirmDelete(false);
    onOpenChange(false);
  }

  useEffect(() => {
    if (medicine) {
      reset({
        name: medicine.name,
        dose: medicine.dose,
        schedule: medicine.schedule,
        times: medicine.times,
        days: medicine.days,
        active: medicine.active,
        linkedModule: medicine.linkedModule,
        linkedId: medicine.linkedId,
        linkedLabel: medicine.linkedLabel,
      });
    } else {
      reset(EMPTY);
    }
  }, [medicine, open, reset]);

  function onSubmit(values: MedicineInput) {
    startTransition(async () => {
      try {
        if (medicine) await updateMedicine(medicine.id, values);
        else await createMedicine(values);
        toast.success(medicine ? "Updated" : "Added");
        close();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!medicine) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteMedicine(medicine.id);
        toast.success("Deleted");
        close();
      } catch {
        toast.error("Could not delete");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            {medicine ? "Edit medicine" : "Add medicine"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Vitamin D"
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="dose">Dose</Label>
              <Input
                id="dose"
                placeholder="e.g. 1000 IU"
                {...register("dose", { setValueAs: (v) => v || null })}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="schedule">Schedule</Label>
              <Input
                id="schedule"
                placeholder="e.g. morning"
                {...register("schedule", { setValueAs: (v) => v || null })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Times</Label>
            <div className="flex flex-wrap items-center gap-2">
              {times.map((t, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Input
                    type="time"
                    value={t}
                    onChange={(e) => setTime(i, e.target.value)}
                    className="w-[7.5rem]"
                  />
                  <button
                    type="button"
                    onClick={() => removeTime(i)}
                    aria-label="Remove time"
                    className="text-fg-4 hover:text-destructive transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTime}
              >
                + time
              </Button>
            </div>
            <p className="text-fg-3 text-xs">
              Times put this dose on the timetable. Leave empty to keep it off the
              grid.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Days</Label>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs transition-colors",
                    days.includes(i)
                      ? "bg-primary text-[var(--accent-fg)]"
                      : "bg-surface-2 text-fg-2 hover:bg-surface-3",
                  )}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
            <p className="text-fg-3 text-xs">
              {days.length === 0 ? "Every day." : "Selected days only."}
            </p>
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
            {medicine ? (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                size="sm"
                onClick={onDelete}
                disabled={pending}
              >
                {confirmDelete ? "Delete?" : "Delete"}
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
                {medicine ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
