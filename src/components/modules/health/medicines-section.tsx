"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Check, Pencil, ArrowUpRight, Pill } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { MoneyEmpty } from "@/components/modules/money/money-empty";
import { linkHref } from "@/lib/todo";
import { setMedicineTaken } from "@/actions/medicines";
import { MedicineModal } from "./medicine-modal";
import type { getMedicines } from "@/actions/medicines";

export type Medicine = Awaited<ReturnType<typeof getMedicines>>[number];

// A soft status tint matching the design's status fills.
const SUCCESS_TINT = "color-mix(in oklch, var(--success) 14%, transparent)";

function MedicineCard({
  medicine,
  today,
  onEdit,
}: {
  medicine: Medicine;
  today: string;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  // Optimistic taken-today: flip on tap, reconcile when the server refreshes.
  const [taken, setTaken] = useState(medicine.takenToday);
  useEffect(() => setTaken(medicine.takenToday), [medicine.takenToday]);

  const href = linkHref(medicine.linkedModule, medicine.linkedId);
  const meta = [medicine.dose, medicine.schedule].filter(Boolean).join(" · ");

  function toggle() {
    const next = !taken;
    setTaken(next);
    startTransition(async () => {
      try {
        await setMedicineTaken(medicine.id, today, next);
      } catch {
        setTaken(medicine.takenToday);
        toast.error("Could not update");
      }
    });
  }

  return (
    <div className="group bg-surface flex flex-col gap-3 rounded-[var(--r)] border p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <span className="bg-surface-2 text-fg-2 flex size-9 items-center justify-center rounded-[var(--r-sm)]">
          <Pill className="size-[17px]" strokeWidth={1.75} />
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          aria-label="Edit medicine"
        >
          <Pencil />
        </Button>
      </div>

      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <h3 className="text-fg truncate text-[15px] font-medium">
            {medicine.name}
          </h3>
          {!medicine.active ? (
            <span className="text-fg-4 shrink-0 text-[11px]">archived</span>
          ) : null}
        </div>
        {meta ? <p className="text-fg-3 truncate text-xs">{meta}</p> : null}
        {href ? (
          <Link
            href={href}
            className="bg-surface-2 text-fg-2 hover:text-fg hover:bg-surface-3 mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors"
          >
            {medicine.linkedLabel || medicine.linkedModule}
            <ArrowUpRight className="size-3" />
          </Link>
        ) : null}
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={toggle}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-full p-2 text-sm font-medium transition-colors",
          taken ? "" : "bg-surface-2 text-fg-2 hover:text-fg",
        )}
        style={
          taken ? { background: SUCCESS_TINT, color: "var(--success)" } : undefined
        }
      >
        <Check className="size-4" strokeWidth={1.75} />
        {taken ? "Taken today" : "Mark taken"}
      </button>
    </div>
  );
}

// The Medicines area: a list of medicines and supplements, each with an optional
// taken-today check.
export function MedicinesSection({
  medicines,
  today,
}: {
  medicines: Medicine[];
  today: string;
}) {
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return medicines;
    return medicines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.dose ?? "").toLowerCase().includes(q) ||
        (m.schedule ?? "").toLowerCase().includes(q),
    );
  }, [medicines, search]);

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  if (medicines.length === 0) {
    return (
      <>
        <MoneyEmpty
          eyebrow="Records · Health"
          message="No medicines or supplements yet. Add the ones you take - a dose and when to take them - and tick them off each day."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> Add medicine
            </Button>
          }
        />
        <MedicineModal
          open={creating}
          onOpenChange={(o) => !o && closeModal()}
          medicine={null}
        />
      </>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search medicines…"
        />
        <Button onClick={() => setCreating(true)}>
          <Plus /> Add medicine
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-fg-3 py-10 text-sm">No medicines match.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {filtered.map((medicine) => (
            <MedicineCard
              key={medicine.id}
              medicine={medicine}
              today={today}
              onEdit={() => setEditing(medicine)}
            />
          ))}
        </div>
      )}

      <MedicineModal
        open={creating || editing !== null}
        onOpenChange={(o) => !o && closeModal()}
        medicine={editing}
      />
    </div>
  );
}
