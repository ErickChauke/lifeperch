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
import { Segmented } from "@/components/modules/money/segmented";
import { dateToDay } from "@/lib/money";
import {
  milestoneSchema,
  MILESTONE_STATUSES,
  STATUS_META,
  TRACKS,
  type MilestoneInput,
} from "@/lib/timeline";
import { createMilestone, updateMilestone, deleteMilestone } from "@/actions/timeline";
import type { Milestone } from "./timeline-board";

const STATUS_OPTIONS = MILESTONE_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }));

function emptyValues(): MilestoneInput {
  return {
    title: "",
    description: null,
    targetDate: format(new Date(), "yyyy-MM-dd"),
    status: "planned",
    track: null,
  };
}

export function MilestoneModal({
  open,
  onOpenChange,
  milestone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: Milestone | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MilestoneInput>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: emptyValues(),
  });

  const status = watch("status");

  // Resets the confirm flag and closes; routed through every close path so a
  // pending delete-confirm never survives a reopen.
  function close() {
    setConfirmDelete(false);
    onOpenChange(false);
  }

  useEffect(() => {
    if (milestone) {
      reset({
        title: milestone.title,
        description: milestone.description,
        targetDate: dateToDay(milestone.targetDate),
        status: milestone.status as MilestoneInput["status"],
        track: (milestone.timeline?.name ?? null) as MilestoneInput["track"],
      });
    } else {
      reset(emptyValues());
    }
  }, [milestone, open, reset]);

  function onSubmit(values: MilestoneInput) {
    startTransition(async () => {
      try {
        if (milestone) await updateMilestone(milestone.id, values);
        else await createMilestone(values);
        toast.success(milestone ? "Milestone updated" : "Milestone added");
        close();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!milestone) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteMilestone(milestone.id);
        toast.success("Milestone deleted");
        close();
      } catch {
        toast.error("Could not delete milestone");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{milestone ? "Edit milestone" : "Add milestone"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="e.g. Finish the degree" {...register("title")} />
            {errors.title ? (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="What does reaching this look like…"
              {...register("description", { setValueAs: (v) => v || null })}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="targetDate">Target date</Label>
              <Input id="targetDate" type="date" className="font-mono" {...register("targetDate")} />
              {errors.targetDate ? (
                <p className="text-destructive text-xs">{errors.targetDate.message}</p>
              ) : null}
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="track">Track</Label>
              <Select id="track" {...register("track", { setValueAs: (v) => v || null })}>
                <option value="">None</option>
                {TRACKS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Segmented options={STATUS_OPTIONS} value={status} onChange={(v) => setValue("status", v)} />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {milestone ? (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                size="sm"
                onClick={onDelete}
                disabled={pending}
              >
                {confirmDelete ? "Delete milestone?" : "Delete"}
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
                {milestone ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
