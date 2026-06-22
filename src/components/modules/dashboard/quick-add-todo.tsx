"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTodo } from "@/actions/todo";

// A one-field quick capture on the dashboard. Adds a normal-priority todo due
// today so it lands straight in the Today list.
export function QuickAddTodo({ today }: { today: string }) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    const value = title.trim();
    if (!value) return;
    startTransition(async () => {
      try {
        await createTodo({
          title: value,
          notes: null,
          priority: "normal",
          tags: [],
          isRecurring: false,
          dayOfWeek: 0,
          specificDate: today,
          startTime: null,
          endTime: null,
          linkedModule: null,
          linkedId: null,
          linkedLabel: null,
        });
        setTitle("");
      } catch {
        toast.error("Could not add todo");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        placeholder="Add a todo for today"
        className="flex-1"
      />
      <Button type="button" size="sm" onClick={add} disabled={pending || !title.trim()}>
        <Plus />
        Add
      </Button>
    </div>
  );
}
