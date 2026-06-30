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
import { Textarea } from "@/components/ui/textarea";
import { healthRuleSchema, type HealthRuleInput } from "@/lib/health";
import {
  createHealthRule,
  updateHealthRule,
  deleteHealthRule,
} from "@/actions/health-rules";
import type { HealthRule } from "./rules-section";

const EMPTY: HealthRuleInput = { text: "", category: null, active: true };

export function HealthRuleModal({
  open,
  onOpenChange,
  rule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: HealthRule | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HealthRuleInput>({
    resolver: zodResolver(healthRuleSchema),
    defaultValues: EMPTY,
  });

  function close() {
    setConfirmDelete(false);
    onOpenChange(false);
  }

  useEffect(() => {
    if (rule) {
      reset({ text: rule.text, category: rule.category, active: rule.active });
    } else {
      reset(EMPTY);
    }
  }, [rule, open, reset]);

  function onSubmit(values: HealthRuleInput) {
    startTransition(async () => {
      try {
        if (rule) await updateHealthRule(rule.id, values);
        else await createHealthRule(values);
        toast.success(rule ? "Rule updated" : "Rule added");
        close();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!rule) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteHealthRule(rule.id);
        toast.success("Rule deleted");
        close();
      } catch {
        toast.error("Could not delete");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit rule" : "Add rule"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="text">Rule</Label>
            <Textarea
              id="text"
              placeholder="e.g. No eating mushrooms"
              {...register("text")}
            />
            {errors.text ? (
              <p className="text-destructive text-xs">{errors.text.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              placeholder="Optional, e.g. Allergy"
              {...register("category", { setValueAs: (v) => v || null })}
            />
          </div>

          <label className="text-fg-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-[var(--accent)]"
              {...register("active")}
            />
            Active
          </label>

          <div className="flex items-center justify-between gap-2 pt-2">
            {rule ? (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                size="sm"
                onClick={onDelete}
                disabled={pending}
              >
                {confirmDelete ? "Delete?" : "Delete"}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={close}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {rule ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
