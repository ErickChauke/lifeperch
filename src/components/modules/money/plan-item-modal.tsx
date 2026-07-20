"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { categoriesFor, stripNegative } from "@/lib/money";
import { MAX_DB_AMOUNT } from "@/lib/currency";
import { addItem, updateItem, deleteItem } from "@/actions/budget";
import type { getPlan } from "@/actions/budget";
import type { getGoals } from "@/actions/goals";
import type { getLoans } from "@/actions/loans";

type Plan = NonNullable<Awaited<ReturnType<typeof getPlan>>>;
type Item = Plan["items"][number];
type Goal = Awaited<ReturnType<typeof getGoals>>[number];
type Loan = Awaited<ReturnType<typeof getLoans>>[number];

type Kind = "income" | "expense";

export function PlanItemModal({
  open,
  onOpenChange,
  planId,
  item,
  defaultKind = "expense",
  goals = [],
  loans = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  item: Item | null;
  defaultKind?: Kind;
  goals?: Goal[];
  loans?: Loan[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [kind, setKind] = useState<Kind>(defaultKind);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  // What the allocation goes toward, as "goal:<id>" or "loan:<id>". One field so
  // a line can never claim to fund a goal and repay a loan at once.
  const [target, setTarget] = useState("");

  const categories = categoriesFor(kind);
  const openLoans = loans.filter((l) => !l.settledAt);

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (item) {
      setKind(item.kind as Kind);
      setCategory(item.category);
      setTitle(item.title ?? "");
      setAmount((item.amount / 100).toString());
      setNote(item.note ?? "");
      setTarget(
        item.loanId ? `loan:${item.loanId}` : item.goalId ? `goal:${item.goalId}` : "",
      );
    } else {
      setKind(defaultKind);
      setCategory("");
      setTitle("");
      setAmount("");
      setNote("");
      setTarget("");
    }
  }, [open, item, defaultKind]);

  function save() {
    const value = Number(amount);
    if (!category) {
      toast.error("Pick a category");
      return;
    }
    if (!value || value <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    if (value > MAX_DB_AMOUNT) {
      toast.error("Amount is too large");
      return;
    }
    const input = {
      kind,
      category,
      title: title.trim() || null,
      amount: value,
      note: note.trim() || null,
      goalId:
        kind === "expense" && target.startsWith("goal:") ? target.slice(5) : null,
      loanId:
        kind === "expense" && target.startsWith("loan:") ? target.slice(5) : null,
    };
    startTransition(async () => {
      try {
        if (item) await updateItem(item.id, input);
        else await addItem(planId, input);
        onOpenChange(false);
        router.refresh();
      } catch {
        toast.error("Could not save the line");
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
        await deleteItem(item.id);
        onOpenChange(false);
        router.refresh();
      } catch {
        toast.error("Could not delete the line");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{item ? "Edit line" : "Add line"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="item-title">Title</Label>
            <Input
              id="item-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Defaults to ${category || "the category"}`}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-note">Description</Label>
            <Textarea
              id="item-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for this line"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-category">Category</Label>
            <Select
              id="item-category"
              placeholder="Select a category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value}
                </option>
              ))}
            </Select>
          </div>

          {kind === "expense" && (goals.length > 0 || openLoans.length > 0) ? (
            <div className="space-y-1.5">
              <Label htmlFor="item-target">Put it toward</Label>
              <Select
                id="item-target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Nothing in particular</option>
                {goals.length > 0 ? (
                  <optgroup label="Savings goals">
                    {goals.map((g) => (
                      <option key={g.id} value={`goal:${g.id}`}>
                        {g.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {openLoans.length > 0 ? (
                  <optgroup label="Loans">
                    {openLoans.map((l) => (
                      <option key={l.id} value={`loan:${l.id}`}>
                        {l.title}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </Select>
              {target ? (
                <p className="text-fg-3 text-xs">
                  {target.startsWith("loan:")
                    ? "This allocation repays the loan; it shows the payoff progress instead of category spend."
                    : "This allocation funds the goal; it shows its progress instead of category spend."}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="item-amount">Planned amount</Label>
            <div className="relative">
              <span className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 font-mono text-sm">
                R
              </span>
              <Input
                id="item-amount"
                type="number"
                step="0.01"
                min="0"
                max={MAX_DB_AMOUNT}
                value={amount}
                onChange={(e) => setAmount(stripNegative(e.target.value))}
                placeholder="0.00"
                className="pl-7 font-mono"
              />
            </div>
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
                {confirmDelete ? "Delete line?" : "Delete"}
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
              <Button type="button" size="sm" onClick={save} disabled={pending}>
                {item ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
