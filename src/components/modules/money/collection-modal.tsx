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
import { Select } from "@/components/ui/select";
import { collectionSchema, type CollectionInput } from "@/lib/wishlist";
import { SPENDING_CATEGORIES } from "@/lib/shopping";
import { createCollection } from "@/actions/wishlist";

const EMPTY: CollectionInput = { title: "", category: SPENDING_CATEGORIES[0].value };

// New-collection modal. On create it opens the new (empty) collection.
export function CollectionModal({
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
        router.push(`/money/wishlist/${collection.id}`);
      } catch {
        toast.error("Could not create the list");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>New list</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="e.g. Photography kit" autoFocus {...register("title")} />
            {errors.title ? (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Select id="category" {...register("category")}>
              {SPENDING_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value}
                </option>
              ))}
            </Select>
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
              Create list
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
