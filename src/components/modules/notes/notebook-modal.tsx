"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { noteCollectionSchema, type NoteCollectionInput } from "@/lib/notes";
import { createCollection } from "@/actions/notes";

const EMPTY: NoteCollectionInput = { title: "", description: "" };

// New-notebook modal. On create it opens the new (empty) notebook.
export function NotebookModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NoteCollectionInput>({
    resolver: zodResolver(noteCollectionSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open, reset]);

  function onSubmit(values: NoteCollectionInput) {
    startTransition(async () => {
      try {
        const notebook = await createCollection(values);
        onOpenChange(false);
        router.push(`/notes/${notebook.id}`);
      } catch {
        toast.error("Could not create the notebook");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>New notebook</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="notebook-title">Title</Label>
            <Input
              id="notebook-title"
              placeholder="e.g. Uni"
              autoFocus
              {...register("title")}
            />
            {errors.title ? (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notebook-description">Description</Label>
            <Textarea
              id="notebook-description"
              placeholder="What this notebook holds (optional)"
              {...register("description")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
              Create notebook
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
