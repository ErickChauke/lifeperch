"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { modules } from "@config/modules.config";
import { iconFor } from "@/components/layout/module-icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { searchEverything, type SearchResult } from "@/actions/search";
import { cn } from "@/lib/utils";

// Global command palette. Opens on the topbar pill, a mobile search button, or
// the ⌘K / Ctrl+K shortcut. Searches every module via searchEverything and deep
// links each result. Keyboard: up/down to move, Enter to open, Esc to close.
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const latest = useRef("");
  const listRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K toggles the palette from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset the query each time the palette closes.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Debounced search. Guards against out-of-order responses with a latest ref.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      latest.current = q;
      startTransition(async () => {
        const res = await searchEverything(q);
        if (latest.current === q) setResults(res);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  const groups = useMemo(() => {
    let idx = 0;
    const out: {
      id: string;
      label: string;
      icon: string;
      items: { result: SearchResult; index: number }[];
    }[] = [];
    for (const m of modules) {
      const items = results.filter((r) => r.moduleId === m.id);
      if (items.length === 0) continue;
      out.push({
        id: m.id,
        label: m.label,
        icon: m.icon,
        items: items.map((result) => ({ result, index: idx++ })),
      });
    }
    return out;
  }, [results]);

  const flat = useMemo(
    () => groups.flatMap((g) => g.items.map((i) => i.result)),
    [groups],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function select(result: SearchResult) {
    setOpen(false);
    router.push(result.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[activeIndex];
      if (item) select(item);
    }
  }

  const q = query.trim();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-surface-2 text-fg-3 hover:border-border-2 hidden h-9 w-60 items-center gap-2 rounded-[var(--r)] border px-3 text-left transition-colors md:flex"
      >
        <Search className="size-4 shrink-0" strokeWidth={1.75} />
        <span className="flex-1 truncate text-[13px]">Search everything…</span>
        <kbd className="bg-surface text-fg-3 rounded-[8px] border px-1.5 py-0.5 font-mono text-[11px]">
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        aria-label="Search"
        title="Search"
        onClick={() => setOpen(true)}
        className="text-fg-2 hover:bg-surface-2 hover:text-fg flex size-9 items-center justify-center rounded-[var(--r-sm)] transition-colors md:hidden"
      >
        <Search className="size-[18px]" strokeWidth={1.75} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          <DialogTitle className="sr-only">Search everything</DialogTitle>
          <div onKeyDown={onKeyDown}>
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="text-fg-3 size-4 shrink-0" strokeWidth={1.75} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search everything…"
                className="placeholder:text-fg-3 h-12 w-full bg-transparent text-sm outline-none"
              />
            </div>

            <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
              {q.length < 2 ? (
                <p className="text-fg-3 px-2 py-6 text-center text-sm">
                  Type to search across LifePerch.
                </p>
              ) : flat.length === 0 ? (
                <p className="text-fg-3 px-2 py-6 text-center text-sm">
                  {pending ? "Searching…" : `No results for "${q}".`}
                </p>
              ) : (
                groups.map((group) => {
                  const Icon = iconFor(group.icon);
                  return (
                    <div key={group.id} className="mb-2 last:mb-0">
                      <div className="text-fg-3 flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium tracking-wide uppercase">
                        <Icon className="size-3.5" strokeWidth={1.75} />
                        {group.label}
                      </div>
                      {group.items.map(({ result, index }) => (
                        <button
                          key={result.href + result.id}
                          type="button"
                          data-active={index === activeIndex}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => select(result)}
                          className={cn(
                            "flex w-full items-center rounded-md px-2 py-2 text-left transition-colors",
                            index === activeIndex
                              ? "bg-surface-2"
                              : "hover:bg-surface-2/60",
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="text-fg block truncate text-sm">
                              {result.title}
                            </span>
                            {result.subtitle ? (
                              <span className="text-fg-3 block truncate text-xs">
                                {result.subtitle}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
