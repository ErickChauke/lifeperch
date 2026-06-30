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
import { dateToDay } from "@/lib/money";
import { healthNoteSchema, type HealthNoteInput } from "@/lib/health";
import {
  createHealthNote,
  updateHealthNote,
  deleteHealthNote,
} from "@/actions/health-notes";
import type { HealthNote } from "./journal-section";

export function HealthNoteModal({
  open,
  onOpenChange,
  note,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: HealthNote | null;
  today: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HealthNoteInput>({
    resolver: zodResolver(healthNoteSchema),
    defaultValues: { date: today, body: "" },
  });

  function close() {
    setConfirmDelete(false);
    onOpenChange(false);
  }

  useEffect(() => {
    if (note) {
      reset({ date: dateToDay(note.date), body: note.body });
    } else {
      reset({ date: today, body: "" });
    }
  }, [note, today, open, reset]);

  function onSubmit(values: HealthNoteInput) {
    startTransition(async () => {
      try {
        if (note) await updateHealthNote(note.id, values);
        else await createHealthNote(values);
        toast.success(note ? "Note updated" : "Note added");
        close();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!note) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteHealthNote(note.id);
        toast.success("Note deleted");
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
          <DialogTitle>{note ? "Edit note" : "New note"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              className="font-mono [color-scheme:dark]"
              {...register("date")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">Note</Label>
            <Textarea
              id="body"
              className="min-h-28"
              placeholder="How you're feeling, symptoms, anything to remember…"
              {...register("body")}
            />
            {errors.body ? (
              <p className="text-destructive text-xs">{errors.body.message}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {note ? (
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
                {note ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
