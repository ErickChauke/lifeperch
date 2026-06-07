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
import { Select } from "@/components/ui/select";
import { Segmented } from "./segmented";
import { wishlistSchema, PRIORITIES, type WishlistInput } from "@/lib/wishlist";
import { SPENDING_CATEGORIES } from "@/lib/shopping";
import { centsToRand } from "@/lib/money";
import { createWish, updateWish, deleteWish } from "@/actions/wishlist";
import type { Wish } from "./wishlist-board";

const EMPTY: WishlistInput = {
  name: "",
  price: 0,
  priority: "medium",
  category: SPENDING_CATEGORIES[0].value,
  note: null,
};

export function WishModal({
  open,
  onOpenChange,
  wish,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wish: Wish | null;
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
  } = useForm<WishlistInput>({
    resolver: zodResolver(wishlistSchema),
    defaultValues: EMPTY,
  });

  const priority = watch("priority");

  useEffect(() => {
    setConfirmDelete(false);
    if (wish) {
      reset({
        name: wish.name,
        price: centsToRand(wish.price),
        priority: wish.priority as WishlistInput["priority"],
        category: wish.category,
        note: wish.note,
      });
    } else {
      reset(EMPTY);
    }
  }, [wish, open, reset]);

  function onSubmit(values: WishlistInput) {
    startTransition(async () => {
      try {
        if (wish) await updateWish(wish.id, values);
        else await createWish(values);
        toast.success(wish ? "Wish updated" : "Wish added");
        onOpenChange(false);
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!wish) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteWish(wish.id);
        toast.success("Wish deleted");
        onOpenChange(false);
      } catch {
        toast.error("Could not delete wish");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{wish ? "Edit wish" : "New wish"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">What is it</Label>
            <Input id="name" placeholder="e.g. Standing desk" {...register("name")} />
            {errors.name ? (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="price">Price</Label>
            <div className="relative">
              <span className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 font-mono text-sm">
                R
              </span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                className="pl-7 font-mono"
                {...register("price", { valueAsNumber: true })}
              />
            </div>
            {errors.price ? (
              <p className="text-destructive text-xs">{errors.price.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Segmented
              options={PRIORITIES}
              value={priority}
              onChange={(v) => setValue("priority", v)}
            />
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

          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Input
              id="note"
              placeholder="Optional"
              {...register("note", { setValueAs: (v) => v || null })}
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {wish ? (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                size="sm"
                onClick={onDelete}
                disabled={pending}
              >
                {confirmDelete ? "Delete wish?" : "Delete"}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
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
                {wish ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
