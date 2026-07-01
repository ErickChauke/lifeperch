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
    formState: { errors },
  } = useForm<MedicineInput>({
    resolver: zodResolver(medicineSchema),
    defaultValues: EMPTY,
  });

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
