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
import { centsToRand, stripNegative } from "@/lib/money";

export type ImportSourceType = "wish" | "shopping" | "plan" | "fixed" | "loan";

export type ImportSource = {
  type: ImportSourceType;
  id: string;
  name: string;
  price: number;
  group: string;
  // Which plan section the source belongs in; absent where the picker is not split.
  kind?: "income" | "expense";
  // Listed but not selectable, with hint explaining why.
  disabled?: boolean;
  hint?: string;
  // Lets the amount be trimmed on the way in, capped at price. Used by pots
  // like a loan, where only part of what is left may be wanted.
  editableAmount?: boolean;
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
  onImport: (
    picked: { type: ImportSourceType; id: string; amount?: number }[],
  ) => Promise<number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Trimmed amounts in rand, keyed by source, for sources that allow it.
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected(new Set());
      setAmounts({});
    }
  }, [open]);

  // The cents this source will import at: the trimmed amount when one is
  // entered and valid, else the full price. Never more than the price.
  function amountFor(s: ImportSource): number {
    const raw = amounts[`${s.type}:${s.id}`];
    if (!s.editableAmount || raw === undefined || raw.trim() === "") return s.price;
    const cents = Math.round(Number(raw) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return s.price;
    return Math.min(cents, s.price);
  }

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

  function toggle(s: ImportSource) {
    if (s.disabled) return;
    const key = `${s.type}:${s.id}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function submit() {
    const picked = sources
      .filter((s) => !s.disabled && selected.has(`${s.type}:${s.id}`))
      .map((s) => ({ type: s.type, id: s.id, amount: amountFor(s) }));
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
  const total = sources.reduce(
    (sum, s) => (!s.disabled && selected.has(`${s.type}:${s.id}`) ? sum + amountFor(s) : sum),
    0,
  );

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
                    const off = !!s.disabled;
                    const trim = on && !off && s.editableAmount;
                    return (
                      <div key={key}>
                        <button
                          type="button"
                          disabled={off}
                          onClick={() => toggle(s)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                            off
                              ? "opacity-50"
                              : on
                                ? "border-accent-line bg-accent-soft"
                                : "hover:bg-surface-2",
                            trim && "rounded-b-none border-b-0",
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
                          <span className="min-w-0 flex-1">
                            <span className="text-fg block truncate text-sm">{s.name}</span>
                            {s.hint ? (
                              <span className="text-fg-3 block truncate text-xs">{s.hint}</span>
                            ) : null}
                          </span>
                          <span className="text-fg-2 shrink-0 font-mono text-sm tabular-nums">
                            {formatZAR(centsToRand(amountFor(s)))}
                          </span>
                        </button>
                        {trim ? (
                          <div className="border-accent-line bg-accent-soft flex items-center gap-2 rounded-b-lg border border-t-0 px-3 pb-3">
                            <span className="text-fg-3 shrink-0 text-xs">Take</span>
                            <div className="relative flex-1">
                              <span className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 font-mono text-xs">
                                R
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={centsToRand(s.price)}
                                value={amounts[key] ?? ""}
                                placeholder={centsToRand(s.price).toFixed(2)}
                                onChange={(e) =>
                                  setAmounts((prev) => ({
                                    ...prev,
                                    [key]: stripNegative(e.target.value),
                                  }))
                                }
                                className="h-8 pl-6 font-mono text-sm"
                              />
                            </div>
                            <span className="text-fg-3 shrink-0 text-xs">
                              of {formatZAR(centsToRand(s.price))}
                            </span>
                          </div>
                        ) : null}
                      </div>
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
            {count > 0 ? (
              <span className="text-fg-2 ml-1 font-mono tabular-nums">
                · {formatZAR(centsToRand(total))}
              </span>
            ) : null}
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
