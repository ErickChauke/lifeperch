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
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "./segmented";
import { categoriesFor, centsToRand, stripNegative } from "@/lib/money";
import { MAX_AMOUNT } from "@/lib/currency";
import { fixedItemSchema, FREQUENCIES, type FixedItemInput } from "@/lib/basic";
import { createFixedItem, updateFixedItem, deleteFixedItem } from "@/actions/basic";
import type { FixedItem } from "./basic-board";

const TYPES = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
] as const;

function emptyValues(): FixedItemInput {
  return {
    kind: "expense",
    category: "",
    title: "",
    amount: undefined as unknown as number,
    frequency: "month",
    note: null,
  };
}

export function FixedItemModal({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FixedItem | null;
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
  } = useForm<FixedItemInput>({
    resolver: zodResolver(fixedItemSchema),
    defaultValues: emptyValues(),
  });

  const kind = watch("kind");
  const category = watch("category");
  const categories = categoriesFor(kind);
  const amountReg = register("amount", { valueAsNumber: true });

  // Loads the selected item into the form, or resets to a blank expense.
  useEffect(() => {
    setConfirmDelete(false);
    if (item) {
      reset({
        kind: item.kind as FixedItemInput["kind"],
        category: item.category,
        title: item.title,
        amount: centsToRand(item.amount),
        frequency: item.frequency as FixedItemInput["frequency"],
        note: item.note,
      });
    } else {
      reset(emptyValues());
    }
  }, [item, open, reset]);

  // Clears the category when the type flips to one whose list does not contain it.
  useEffect(() => {
    if (category && !categories.some((c) => c.value === category)) {
      setValue("category", "");
    }
  }, [kind, category, categories, setValue]);

  function onSubmit(values: FixedItemInput) {
    startTransition(async () => {
      try {
        if (item) await updateFixedItem(item.id, values);
        else await createFixedItem(values);
        toast.success(item ? "Fixed item updated" : "Fixed item added");
        onOpenChange(false);
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!item) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteFixedItem(item.id);
        toast.success("Fixed item deleted");
        onOpenChange(false);
      } catch {
        toast.error("Could not delete the item");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{item ? "Edit fixed item" : "Add fixed item"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Segmented options={TYPES} value={kind} onChange={(v) => setValue("kind", v)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fixed-title">Name</Label>
            <Input id="fixed-title" placeholder="Salary, Rent, Netflix…" {...register("title")} />
            {errors.title ? (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fixed-amount">Amount</Label>
              <div className="relative">
                <span className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 font-mono text-sm">
                  R
                </span>
                <Input
                  id="fixed-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={MAX_AMOUNT}
                  className="pl-7 font-mono"
                  {...amountReg}
                  onChange={(e) => {
                    e.target.value = stripNegative(e.target.value);
                    amountReg.onChange(e);
                  }}
                />
              </div>
              {errors.amount ? (
                <p className="text-destructive text-xs">{errors.amount.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fixed-frequency">Every</Label>
              <Select id="fixed-frequency" {...register("frequency")}>
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fixed-category">Category</Label>
            <Select id="fixed-category" placeholder="Select a category" {...register("category")}>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value}
                </option>
              ))}
            </Select>
            {errors.category ? (
              <p className="text-destructive text-xs">{errors.category.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fixed-note">Note</Label>
            <Textarea
              id="fixed-note"
              placeholder="Optional"
              {...register("note", { setValueAs: (v) => v || null })}
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {item ? (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                size="sm"
                onClick={onDelete}
                disabled={pending}
              >
                {confirmDelete ? "Delete item?" : "Delete"}
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
                {item ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
