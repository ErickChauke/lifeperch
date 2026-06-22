"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { X } from "lucide-react";
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
import { Segmented } from "@/components/modules/money/segmented";
import { WEEKDAYS } from "@/lib/timetable";
import { normalizeTags } from "@/lib/notes";
import {
  todoSchema,
  PRIORITIES,
  LINKABLE_MODULES,
  type Priority,
  type TodoInput,
} from "@/lib/todo";
import { createTodo, updateTodo, deleteTodo } from "@/actions/todo";
import type { Todo } from "./todo-board";

const EMPTY: TodoInput = {
  title: "",
  notes: null,
  priority: "normal",
  tags: [],
  isRecurring: false,
  dayOfWeek: 0,
  specificDate: null,
  startTime: null,
  endTime: null,
  linkedModule: null,
  linkedId: null,
  linkedLabel: null,
};

// Priority options ordered low to high for a left-to-right ramp.
const PRIORITY_OPTIONS = [...PRIORITIES]
  .reverse()
  .map((p) => ({ value: p.value, label: p.label }));

export function TodoModal({
  open,
  onOpenChange,
  todo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo: Todo | null;
}) {
  const [pending, startTransition] = useTransition();
  const [tagDraft, setTagDraft] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<TodoInput>({
    resolver: zodResolver(todoSchema),
    defaultValues: EMPTY,
  });

  const isRecurring = useWatch({ control, name: "isRecurring" });
  const priority = useWatch({ control, name: "priority" }) ?? "normal";
  const tags = useWatch({ control, name: "tags" }) ?? [];
  const startTime = useWatch({ control, name: "startTime" });
  const timed = startTime != null;

  // Loads the selected todo into the form, or resets to empty for add.
  useEffect(() => {
    if (todo) {
      reset({
        title: todo.title,
        notes: todo.notes,
        priority: todo.priority as Priority,
        tags: todo.tags,
        isRecurring: todo.isRecurring,
        dayOfWeek: todo.dayOfWeek ?? 0,
        specificDate: todo.specificDate
          ? format(new Date(todo.specificDate), "yyyy-MM-dd")
          : null,
        startTime: todo.startTime,
        endTime: todo.endTime,
        linkedModule: todo.linkedModule,
        linkedId: todo.linkedId,
        linkedLabel: todo.linkedLabel,
      });
    } else {
      reset(EMPTY);
    }
  }, [todo, open, reset]);

  function toggleTimed(on: boolean) {
    if (on) {
      setValue("startTime", "09:00", { shouldValidate: true });
      setValue("endTime", "10:00", { shouldValidate: true });
    } else {
      setValue("startTime", null, { shouldValidate: true });
      setValue("endTime", null, { shouldValidate: true });
    }
  }

  function addTag() {
    setValue("tags", normalizeTags([...tags, tagDraft]), { shouldDirty: true });
    setTagDraft("");
  }

  function removeTag(tag: string) {
    setValue(
      "tags",
      tags.filter((t) => t !== tag),
      { shouldDirty: true },
    );
  }

  function onSubmit(values: TodoInput) {
    startTransition(async () => {
      try {
        if (todo) await updateTodo(todo.id, values);
        else await createTodo(values);
        toast.success(todo ? "Todo updated" : "Todo added");
        onOpenChange(false);
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!todo) return;
    startTransition(async () => {
      try {
        await deleteTodo(todo.id);
        toast.success("Todo deleted");
        onOpenChange(false);
      } catch {
        toast.error("Could not delete todo");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{todo ? "Edit todo" : "Add todo"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title ? (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Segmented
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={(v) => setValue("priority", v)}
            />
          </div>

          <Label className="gap-2">
            <input type="checkbox" {...register("isRecurring")} />
            Repeats weekly
          </Label>

          {isRecurring ? (
            <div className="space-y-1.5">
              <Label htmlFor="dayOfWeek">Day</Label>
              <Select
                id="dayOfWeek"
                {...register("dayOfWeek", {
                  setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                })}
              >
                {WEEKDAYS.map((day, i) => (
                  <option key={day} value={i}>
                    {day}
                  </option>
                ))}
              </Select>
              {errors.dayOfWeek ? (
                <p className="text-destructive text-xs">
                  {errors.dayOfWeek.message}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="specificDate">Date</Label>
              <Input
                id="specificDate"
                type="date"
                {...register("specificDate", { setValueAs: (v) => v || null })}
              />
              <p className="text-fg-3 text-xs">Leave blank for a flexible backlog item.</p>
            </div>
          )}

          <Label className="gap-2">
            <input
              type="checkbox"
              checked={timed}
              onChange={(e) => toggleTimed(e.target.checked)}
            />
            Time block
          </Label>

          {timed ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startTime">Start</Label>
                <Input
                  id="startTime"
                  type="time"
                  {...register("startTime", { setValueAs: (v) => v || null })}
                />
                {errors.startTime ? (
                  <p className="text-destructive text-xs">
                    {errors.startTime.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endTime">End</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...register("endTime", { setValueAs: (v) => v || null })}
                />
                {errors.endTime ? (
                  <p className="text-destructive text-xs">
                    {errors.endTime.message}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="border-input flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-surface-3 text-fg-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-destructive transition-colors"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="+ tag"
                className="placeholder:text-fg-4 w-20 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="linkedModule">Link to</Label>
              <Select
                id="linkedModule"
                {...register("linkedModule", { setValueAs: (v) => v || null })}
              >
                <option value="">None</option>
                {LINKABLE_MODULES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="linkedLabel">Link label</Label>
              <Input
                id="linkedLabel"
                {...register("linkedLabel", { setValueAs: (v) => v || null })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes", { setValueAs: (v) => v || null })}
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {todo ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onDelete}
                disabled={pending}
              >
                Delete
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
                {todo ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
