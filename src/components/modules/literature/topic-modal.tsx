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
import { litCollectionSchema, type LitCollectionInput } from "@/lib/literature";
import { createCollection } from "@/actions/literature";

const EMPTY: LitCollectionInput = { title: "", description: "" };

// New-topic modal. On create it opens the new (empty) topic.
export function TopicModal({
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
  } = useForm<LitCollectionInput>({
    resolver: zodResolver(litCollectionSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open, reset]);

  function onSubmit(values: LitCollectionInput) {
    startTransition(async () => {
      try {
        const topic = await createCollection(values);
        onOpenChange(false);
        router.push(`/literature/${topic.id}`);
      } catch {
        toast.error("Could not create the topic");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>New topic</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="topic-title">Title</Label>
            <Input
              id="topic-title"
              placeholder="e.g. Thesis lit review"
              autoFocus
              {...register("title")}
            />
            {errors.title ? (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="topic-description">Description</Label>
            <Textarea
              id="topic-description"
              placeholder="What this topic is about (optional)"
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
              Create topic
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
