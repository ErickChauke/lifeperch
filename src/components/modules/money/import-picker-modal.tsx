"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";

export type ImportSourceType = "wish" | "shopping" | "plan";

export type ImportSource = {
  type: ImportSourceType;
  id: string;
  name: string;
  price: number;
  group: string;
};

export function ImportPickerModal({
  open,
  onOpenChange,
  title = "Import items",
  sources,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  sources: ImportSource[];
  onImport: (picked: { type: ImportSourceType; id: string }[]) => Promise<number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected(new Set());
    }
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q ? sources.filter((s) => s.name.toLowerCase().includes(q)) : sources;
    const order: string[] = [];
    const byGroup = new Map<string, ImportSource[]>();
    for (const s of matched) {
      if (!byGroup.has(s.group)) {
        byGroup.set(s.group, []);
        order.push(s.group);
      }
      byGroup.get(s.group)!.push(s);
    }
    return order.map((g) => ({ group: g, items: byGroup.get(g)! }));
  }, [sources, query]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function submit() {
    const picked = sources
      .filter((s) => selected.has(`${s.type}:${s.id}`))
      .map((s) => ({ type: s.type, id: s.id }));
    if (picked.length === 0) return;
    startTransition(async () => {
      try {
        const added = await onImport(picked);
        toast.success(added > 0 ? `Added ${added} ${added === 1 ? "item" : "items"}` : "Already on this list");
        onOpenChange(false);
        router.refresh();
      } catch {
        toast.error("Could not import");
      }
    });
  }

  const count = selected.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items…"
            className="h-9 pl-8"
          />
        </div>

        {sources.length === 0 ? (
          <p className="text-fg-3 py-6 text-center text-sm">Nothing to import yet.</p>
        ) : groups.length === 0 ? (
          <p className="text-fg-3 py-6 text-center text-sm">No matches.</p>
        ) : (
          <div className="-mr-1 max-h-[55vh] space-y-4 overflow-y-auto pr-1">
            {groups.map(({ group, items }) => (
              <div key={group} className="space-y-1.5">
                <p className="text-fg-3 font-mono text-[10.5px] uppercase tracking-[0.10em]">
                  {group}
                </p>
                <div className="space-y-1.5">
                  {items.map((s) => {
                    const key = `${s.type}:${s.id}`;
                    const on = selected.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggle(key)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                          on ? "border-accent-line bg-accent-soft" : "hover:bg-surface-2",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors",
                            on
                              ? "border-transparent bg-[var(--accent)] text-[var(--accent-fg)]"
                              : "border-border-2",
                          )}
                        >
                          {on ? <Check className="size-3.5" /> : null}
                        </span>
                        <span className="text-fg min-w-0 flex-1 truncate text-sm">{s.name}</span>
                        <span className="text-fg-2 shrink-0 font-mono text-sm tabular-nums">
                          {formatZAR(centsToRand(s.price))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <span className="text-fg-3 text-sm">
            {count} selected
          </span>
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
            <Button type="button" size="sm" onClick={submit} disabled={pending || count === 0}>
              Add {count > 0 ? count : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
