"use client";

import { useEffect, useTransition } from "react";
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
import { shoppingItemSchema, type ShoppingItemInput } from "@/lib/shopping";
import { centsToRand, stripNegative } from "@/lib/money";
import { MAX_AMOUNT } from "@/lib/currency";
import { updateShoppingItem } from "@/actions/shopping";
import type { Item } from "./shopping-list-detail";

const EMPTY: ShoppingItemInput = { name: "", price: 0, quantity: 1 };

export function ShoppingItemModal({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
}) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShoppingItemInput>({
    resolver: zodResolver(shoppingItemSchema),
    defaultValues: EMPTY,
  });
  const priceReg = register("price", { valueAsNumber: true });
  const quantityReg = register("quantity", { valueAsNumber: true });

  useEffect(() => {
    if (item) {
      reset({ name: item.name, price: centsToRand(item.price), quantity: item.quantity });
    } else {
      reset(EMPTY);
    }
  }, [item, open, reset]);

  function onSubmit(values: ShoppingItemInput) {
    if (!item) return;
    startTransition(async () => {
      try {
        await updateShoppingItem(item.id, values);
        toast.success("Item updated");
        onOpenChange(false);
      } catch {
        toast.error("Could not update item");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Edit item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="item-name">Name</Label>
            <Input id="item-name" placeholder="e.g. Milk" autoFocus {...register("name")} />
            {errors.name ? (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="item-price">Price</Label>
              <div className="relative">
                <span className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 font-mono text-sm">
                  R
                </span>
                <Input
                  id="item-price"
                  type="number"
                  step="0.01"
                  min="0"
                  max={MAX_AMOUNT}
                  className="pl-7 font-mono"
                  {...priceReg}
                  onChange={(e) => {
                    e.target.value = stripNegative(e.target.value);
                    priceReg.onChange(e);
                  }}
                />
              </div>
              {errors.price ? (
                <p className="text-destructive text-xs">{errors.price.message}</p>
              ) : null}
            </div>

            <div className="w-24 space-y-1.5">
              <Label htmlFor="item-quantity">Quantity</Label>
              <Input
                id="item-quantity"
                type="number"
                step="1"
                min="1"
                className="font-mono"
                {...quantityReg}
                onChange={(e) => {
                  e.target.value = stripNegative(e.target.value);
                  quantityReg.onChange(e);
                }}
              />
              {errors.quantity ? (
                <p className="text-destructive text-xs">{errors.quantity.message}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
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
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
