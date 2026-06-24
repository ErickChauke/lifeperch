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
import { collectionSchema, type CollectionInput } from "@/lib/vault";
import { createCollection } from "@/actions/vault";

const EMPTY: CollectionInput = { title: "", description: "", password: "" };

// New-card modal. On create it opens the new (empty) card. The password is
// optional: leave it blank for an open card.
export function CardModal({
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
  } = useForm<CollectionInput>({
    resolver: zodResolver(collectionSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open, reset]);

  function onSubmit(values: CollectionInput) {
    startTransition(async () => {
      try {
        const collection = await createCollection(values);
        onOpenChange(false);
        router.push(`/vault/${collection.id}`);
      } catch {
        toast.error("Could not create the card");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>New card</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Personal Contracts"
              autoFocus
              {...register("title")}
            />
            {errors.title ? (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What lives in this card (optional)"
              {...register("description")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Leave blank for an open card"
              {...register("password")}
            />
            <p className="text-fg-4 text-xs">
              Locks this card separately, on top of your vault PIN.
            </p>
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
              Create card
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
