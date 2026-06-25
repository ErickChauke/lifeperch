"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { Segmented } from "./segmented";
import {
  PERIOD_TYPES,
  periodRange,
  defaultTitle,
  periodLabel,
  type PeriodType,
} from "@/lib/budget";
import { createPlan, updatePlan } from "@/actions/budget";
import type { getPlans } from "@/actions/budget";

type Plan = Awaited<ReturnType<typeof getPlans>>[number];

const PERIOD_OPTIONS = PERIOD_TYPES.map((p) => ({ value: p.value, label: p.label }));

function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// New / edit plan. Month and week snap to calendar bounds from an anchor day;
// custom takes both ends. The title defaults from the period until edited.
export function PlanModal({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const today = toDay(new Date());
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [anchor, setAnchor] = useState(today);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [title, setTitle] = useState("");
  const [titleDirty, setTitleDirty] = useState(false);

  // The resolved range for the chosen period.
  const range = useMemo(() => {
    if (periodType === "custom") return { start, end };
    return periodRange(periodType, anchor);
  }, [periodType, anchor, start, end]);

  // Seed from the plan being edited, or reset for a new plan.
  useEffect(() => {
    if (!open) return;
    if (plan) {
      const s = toDay(plan.startDate);
      const e = toDay(plan.endDate);
      setPeriodType(plan.periodType as PeriodType);
      setAnchor(s);
      setStart(s);
      setEnd(e);
      setTitle(plan.title);
      setTitleDirty(true);
    } else {
      setPeriodType("month");
      setAnchor(today);
      setStart(today);
      setEnd(today);
      setTitle("");
      setTitleDirty(false);
    }
    // today is derived per render; only re-seed when open/plan change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan]);

  // Keep the title in step with the period until the user types their own.
  useEffect(() => {
    if (!titleDirty) setTitle(defaultTitle(periodType, range.start, range.end));
  }, [periodType, range.start, range.end, titleDirty]);

  function save() {
    if (!title.trim()) {
      toast.error("Name the plan");
      return;
    }
    if (range.end < range.start) {
      toast.error("End date is before the start date");
      return;
    }
    const input = {
      title: title.trim(),
      periodType,
      startDate: range.start,
      endDate: range.end,
    };
    startTransition(async () => {
      try {
        if (plan) {
          await updatePlan(plan.id, input);
          onOpenChange(false);
          router.refresh();
        } else {
          const created = await createPlan(input);
          onOpenChange(false);
          router.push(`/money/plan/${created.id}`);
        }
      } catch {
        toast.error("Could not save the plan");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{plan ? "Edit plan" : "New plan"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Period</Label>
            <Segmented
              options={PERIOD_OPTIONS}
              value={periodType}
              onChange={setPeriodType}
            />
          </div>

          {periodType === "custom" ? (
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="plan-start">Start</Label>
                <Input
                  id="plan-start"
                  type="date"
                  className="font-mono"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="plan-end">End</Label>
                <Input
                  id="plan-end"
                  type="date"
                  className="font-mono"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="plan-anchor">
                {periodType === "month" ? "Any day in the month" : "Any day in the week"}
              </Label>
              <Input
                id="plan-anchor"
                type="date"
                className="font-mono"
                value={anchor}
                onChange={(e) => setAnchor(e.target.value)}
              />
              <p className="text-fg-3 text-xs">{periodLabel(range.start, range.end)}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="plan-title">Title</Label>
            <Input
              id="plan-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleDirty(true);
              }}
              placeholder="e.g. June 2026"
            />
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
            <Button type="button" size="sm" onClick={save} disabled={pending}>
              {plan ? "Save" : "Create plan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
