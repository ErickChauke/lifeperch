"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
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
import { Textarea } from "@/components/ui/textarea";
import { centsToRand, dateToDay } from "@/lib/money";
import { applicationSchema, APP_STAGES, STAGE_META, type ApplicationInput } from "@/lib/jobs";
import { createJob, updateJob, deleteJob } from "@/actions/jobs";
import type { Application } from "./jobs-board";

function emptyValues(): ApplicationInput {
  return {
    organisation: "",
    position: "",
    location: null,
    url: null,
    description: null,
    value: null,
    status: "to-apply",
    outcome: null,
    appliedDate: null,
    deadline: null,
  };
}

export function ApplicationModal({
  open,
  onOpenChange,
  application,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: emptyValues(),
  });

  // Resets the confirm flag and closes; routed through every close path so a
  // pending delete-confirm never survives a reopen.
  function close() {
    setConfirmDelete(false);
    onOpenChange(false);
  }

  useEffect(() => {
    if (application) {
      reset({
        organisation: application.organisation,
        position: application.position,
        location: application.location,
        url: application.url,
        description: application.description,
        value: application.value == null ? null : centsToRand(application.value),
        status: application.status as ApplicationInput["status"],
        outcome: application.outcome as ApplicationInput["outcome"],
        appliedDate: application.appliedDate ? dateToDay(application.appliedDate) : null,
        deadline: application.deadline ? dateToDay(application.deadline) : null,
      });
    } else {
      reset(emptyValues());
    }
  }, [application, open, reset]);

  function onSubmit(values: ApplicationInput) {
    startTransition(async () => {
      try {
        if (application) await updateJob(application.id, values);
        else await createJob(values);
        toast.success(application ? "Application updated" : "Application added");
        close();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!application) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteJob(application.id);
        toast.success("Application deleted");
        close();
      } catch {
        toast.error("Could not delete application");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{application ? "Edit application" : "Add application"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="organisation">Organisation</Label>
            <Input id="organisation" placeholder="e.g. Allan Gray" {...register("organisation")} />
            {errors.organisation ? (
              <p className="text-destructive text-xs">{errors.organisation.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="position">Position / programme</Label>
            <Input id="position" placeholder="e.g. Graduate developer" {...register("position")} />
            {errors.position ? (
              <p className="text-destructive text-xs">{errors.position.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Optional"
              {...register("location", { setValueAs: (v) => v || null })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="url">Link to posting</Label>
            <Input
              id="url"
              placeholder="https://… (optional)"
              className="font-mono"
              {...register("url", { setValueAs: (v) => v || null })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional - what the role is, why it caught your eye, anything to remember"
              rows={3}
              {...register("description", { setValueAs: (v) => v || null })}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="value">Value</Label>
              <div className="relative">
                <span className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 font-mono text-sm">
                  R
                </span>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Optional"
                  className="pl-7 font-mono"
                  {...register("value", {
                    setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                  })}
                />
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="appliedDate">Applied date</Label>
              <Input
                id="appliedDate"
                type="date"
                className="font-mono"
                {...register("appliedDate", { setValueAs: (v) => v || null })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              className="font-mono"
              {...register("deadline", { setValueAs: (v) => v || null })}
            />
            <p className="text-fg-3 text-xs">Closing date - handy while still to apply.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Stage</Label>
            <Select id="status" {...register("status")}>
              {APP_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_META[s].label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {application ? (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                size="sm"
                onClick={onDelete}
                disabled={pending}
              >
                {confirmDelete ? "Delete application?" : "Delete"}
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
                {application ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
