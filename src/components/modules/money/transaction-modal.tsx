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
import { Segmented } from "./segmented";
import {
  transactionSchema,
  categoriesFor,
  centsToRand,
  dateToDay,
  type TransactionInput,
} from "@/lib/money";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/actions/money";
import type { Transaction } from "./transactions-board";

const TYPES = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
] as const;

function emptyValues(): TransactionInput {
  return {
    type: "expense",
    amount: undefined as unknown as number,
    category: "Groceries",
    date: format(new Date(), "yyyy-MM-dd"),
    description: null,
  };
}

export function TransactionModal({
  open,
  onOpenChange,
  transaction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
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
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: emptyValues(),
  });

  const type = watch("type");
  const category = watch("category");
  const categories = categoriesFor(type);

  // Loads the selected transaction into the form, or resets to a blank expense.
  useEffect(() => {
    setConfirmDelete(false);
    if (transaction) {
      reset({
        type: transaction.type as TransactionInput["type"],
        amount: centsToRand(transaction.amount),
        category: transaction.category,
        date: dateToDay(transaction.date),
        description: transaction.description,
      });
    } else {
      reset(emptyValues());
    }
  }, [transaction, open, reset]);

  // Keeps the category valid when the type flips between income and expense.
  useEffect(() => {
    if (!categories.some((c) => c.value === category)) {
      setValue("category", categories[0].value);
    }
  }, [type, category, categories, setValue]);

  function onSubmit(values: TransactionInput) {
    startTransition(async () => {
      try {
        if (transaction) await updateTransaction(transaction.id, values);
        else await createTransaction(values);
        toast.success(transaction ? "Transaction updated" : "Transaction added");
        onOpenChange(false);
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!transaction) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteTransaction(transaction.id);
        toast.success("Transaction deleted");
        onOpenChange(false);
      } catch {
        toast.error("Could not delete transaction");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Edit transaction" : "Add transaction"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Segmented
              options={TYPES}
              value={type}
              onChange={(v) => setValue("type", v)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 font-mono text-sm">
                R
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                className="pl-7 font-mono"
                {...register("amount", { valueAsNumber: true })}
              />
            </div>
            {errors.amount ? (
              <p className="text-destructive text-xs">{errors.amount.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Select id="category" {...register("category")}>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              className="font-mono"
              {...register("date")}
            />
            {errors.date ? (
              <p className="text-destructive text-xs">{errors.date.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Optional"
              {...register("description", { setValueAs: (v) => v || null })}
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {transaction ? (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                size="sm"
                onClick={onDelete}
                disabled={pending}
              >
                {confirmDelete ? "Delete transaction?" : "Delete"}
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
                {transaction ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
