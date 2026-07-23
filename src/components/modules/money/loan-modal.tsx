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
import { loanSchema, loanOutstanding, type LoanInput } from "@/lib/loans";
import { formatEta } from "@/lib/goals";
import { randToCents, centsToRand, stripNegative } from "@/lib/money";
import { formatZAR } from "@/lib/utils";
import { MAX_DB_AMOUNT } from "@/lib/currency";
import { createLoan, updateLoan, deleteLoan } from "@/actions/loans";
import { monthsToClear } from "@/lib/extra";
import { dayToDate, dateToDay } from "@/lib/money";
import { ExtraFields } from "./extra-fields";
import type { Loan } from "./loans-board";
import type { Goal } from "./goals-board";

const EMPTY: LoanInput = {
  title: "",
  amount: 0,
  goalId: null,
  monthly: 0,
  extraAmount: 0,
  extraFrequency: "month",
  extraDate: "",
  note: "",
};

// A money field with a leading R adornment, registered as a number.
function MoneyField({
  id,
  label,
  register,
  error,
}: {
  id: "amount" | "monthly";
  label: string;
  register: ReturnType<typeof useForm<LoanInput>>["register"];
  error?: string;
}) {
  const reg = register(id, { valueAsNumber: true });
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 font-mono text-sm">
          R
        </span>
        <Input
          id={id}
          type="number"
          step="0.01"
          min="0"
          max={MAX_DB_AMOUNT}
          className="pl-7 font-mono"
          {...reg}
          onChange={(e) => {
            e.target.value = stripNegative(e.target.value);
            reg.onChange(e);
          }}
        />
      </div>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

// Says what picking this source will actually do to the balances. "No goal" is
// not a pot: nothing is held there and nothing moves, which is worth stating
// outright rather than leaving it to be inferred from a label.
function describeSource(
  loan: Loan | null,
  goalId: string | null,
  nextGoal: Goal | undefined,
  owed: number,
): string | null {
  if (!loan) {
    return nextGoal
      ? `The amount moves out of ${nextGoal.name} and returns as you repay.`
      : "No savings balance moves. The debt is only tracked here.";
  }
  if ((loan.goalId ?? null) === goalId) {
    return goalId
      ? null
      : "No savings balance moves. The debt is only tracked here.";
  }
  if (owed === 0) {
    return "This loan is repaid, so changing the source moves no money.";
  }
  const amount = formatZAR(centsToRand(owed));
  const from = loan.goal?.name;
  if (from && nextGoal) {
    return `Returns ${amount} to ${from} and takes it from ${nextGoal.name}.`;
  }
  if (from) return `Returns ${amount} to ${from}. No goal is charged.`;
  if (nextGoal) return `Takes ${amount} from ${nextGoal.name}.`;
  return null;
}

export function LoanModal({
  open,
  onOpenChange,
  loan,
  goals,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan | null;
  goals: Goal[];
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LoanInput>({
    resolver: zodResolver(loanSchema),
    defaultValues: EMPTY,
  });

  const amount = watch("amount");
  const monthly = watch("monthly");
  const goalId = watch("goalId");
  const extraAmount = watch("extraAmount");
  const extraFrequency = watch("extraFrequency");
  const extraDate = watch("extraDate");
  const monthlyCents = randToCents(Number(monthly) || 0);
  const amountCents = loan ? loanOutstanding(loan) : randToCents(Number(amount) || 0);
  const eta = monthsToClear(amountCents, monthlyCents, {
    extraAmount: randToCents(Number(extraAmount) || 0),
    extraFrequency,
    extraDate: extraDate ? dayToDate(extraDate) : null,
  });
  const nextGoal = goals.find((g) => g.id === goalId);
  // What the source goal is still out by, and so what a re-point moves.
  const owed = loan ? loanOutstanding(loan) : 0;
  const sourceHint = describeSource(loan, goalId || null, nextGoal, owed);

  useEffect(() => {
    setConfirmDelete(false);
    if (loan) {
      reset({
        title: loan.title,
        amount: centsToRand(loan.principal),
        goalId: loan.goalId,
        monthly: centsToRand(loan.monthlyAmount),
        extraAmount: centsToRand(loan.extraAmount),
        extraFrequency: (loan.extraFrequency as LoanInput["extraFrequency"]) ?? "month",
        extraDate: loan.extraDate ? dateToDay(loan.extraDate) : "",
        note: loan.note ?? "",
      });
    } else {
      reset(EMPTY);
    }
  }, [loan, open, reset]);

  function onSubmit(values: LoanInput) {
    startTransition(async () => {
      try {
        if (loan) {
          await updateLoan(loan.id, {
            title: values.title,
            goalId: values.goalId || null,
            monthly: values.monthly,
            extraAmount: values.extraAmount,
            extraFrequency: values.extraFrequency,
            extraDate: values.extraDate,
            note: values.note,
          });
        } else {
          await createLoan({ ...values, goalId: values.goalId || null });
        }
        toast.success(loan ? "Loan updated" : "Loan recorded");
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!loan) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteLoan(loan.id);
        toast.success("Loan deleted");
        onOpenChange(false);
      } catch {
        toast.error("Could not delete loan");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{loan ? "Edit loan" : "New loan"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">What is it for</Label>
            <Input id="title" placeholder="e.g. Laptop repair" {...register("title")} />
            {errors.title ? (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            ) : null}
          </div>

          {loan ? (
            // The principal is fixed once borrowed; the source is not.
            <p className="text-fg-3 text-sm">
              Borrowed{" "}
              <span className="text-fg font-mono">{formatZAR(centsToRand(loan.principal))}</span>{" "}
              from {loan.goal ? loan.goal.name : "no goal"} · repaid{" "}
              <span className="text-fg font-mono">{formatZAR(centsToRand(loan.repaid))}</span>
            </p>
          ) : (
            <MoneyField
              id="amount"
              label="Amount"
              register={register}
              error={errors.amount?.message}
            />
          )}

          <div className="space-y-1.5">
            <Label htmlFor="goalId">Borrow from</Label>
            <Select id="goalId" {...register("goalId")}>
              <option value="">Not from a goal</option>
              {goals.map((g) => (
                <option
                  key={g.id}
                  value={g.id}
                  // Editing: a goal has to cover what is still owed before the
                  // loan can point at it. The current source always stays picked.
                  disabled={
                    loan
                      ? g.id !== loan.goalId && g.currentAmount < owed
                      : g.currentAmount <= 0
                  }
                >
                  {g.name} · {formatZAR(centsToRand(g.currentAmount))} available
                </option>
              ))}
            </Select>
            {sourceHint ? <p className="text-fg-3 text-xs">{sourceHint}</p> : null}
          </div>

          <MoneyField
            id="monthly"
            label="Monthly repayment"
            register={register}
            error={errors.monthly?.message}
          />

          <ExtraFields
            amount={register("extraAmount", { valueAsNumber: true })}
            frequency={register("extraFrequency")}
            date={register("extraDate")}
            cadence={extraFrequency}
            hint="Anything you put in beyond the monthly amount, like R50 a day, or a payment you are expecting on a date."
          />

          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Input id="note" placeholder="Optional" {...register("note")} />
          </div>

          {eta !== null ? (
            <p className="text-fg-3 font-mono text-xs">≈ {formatEta(eta)} to pay it off</p>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-2">
            {loan ? (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                size="sm"
                disabled={pending}
                onClick={onDelete}
              >
                {confirmDelete ? "Really delete? Debt is written off" : "Delete"}
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : loan ? "Save" : "Borrow"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
