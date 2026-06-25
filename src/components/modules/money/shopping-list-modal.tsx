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
import {
  shoppingListSchema,
  SPENDING_CATEGORIES,
  type ShoppingListInput,
} from "@/lib/shopping";
import { createShoppingList } from "@/actions/shopping";

const EMPTY: ShoppingListInput = { title: "", category: "" };

// New-list modal. On create it opens the new (empty) list so the user can add.
export function ShoppingListModal({
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
  } = useForm<ShoppingListInput>({
    resolver: zodResolver(shoppingListSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open, reset]);

  function onSubmit(values: ShoppingListInput) {
    startTransition(async () => {
      try {
        const list = await createShoppingList(values);
        onOpenChange(false);
        router.push(`/money/shopping/${list.id}`);
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
            <Input id="title" placeholder="e.g. Checkers run" autoFocus {...register("title")} />
            {errors.title ? (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Select id="category" placeholder="Select a category" {...register("category")}>
              {SPENDING_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value}
                </option>
              ))}
            </Select>
            {errors.category ? (
              <p className="text-destructive text-xs">{errors.category.message}</p>
            ) : null}
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
