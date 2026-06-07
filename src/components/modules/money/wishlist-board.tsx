"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn, formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";
import { priorityRank } from "@/lib/wishlist";
import { goalPercent } from "@/lib/goals";
import { MoneyEmpty } from "./money-empty";
import { WishModal } from "./wish-modal";
import { saveForWish } from "@/actions/wishlist";
import type { getWishes } from "@/actions/wishlist";
import type { getGoals } from "@/actions/goals";

export type Wish = Awaited<ReturnType<typeof getWishes>>[number];
type Goal = Awaited<ReturnType<typeof getGoals>>[number];

export function WishlistBoard({
  wishes,
  goals,
}: {
  wishes: Wish[];
  goals: Goal[];
}) {
  const [editing, setEditing] = useState<Wish | null>(null);
  const [creating, setCreating] = useState(false);

  const sorted = [...wishes].sort(
    (a, b) => priorityRank(a.priority) - priorityRank(b.priority) || b.price - a.price,
  );
  const totalWorth = wishes.reduce((sum, w) => sum + w.price, 0);
  const goalByName = new Map(goals.map((g) => [g.name, g]));

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  if (wishes.length === 0) {
    return (
      <>
        <MoneyEmpty
          eyebrow="Records · Money · Wishlist"
          message="Nothing on the wishlist. Park the things you want here — then turn any of them into a savings goal."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> New wish
            </Button>
          }
        />
        <WishModal
          open={creating}
          onOpenChange={(o) => !o && closeModal()}
          wish={null}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-fg-2 text-sm">
          Wishlist worth{" "}
          <span className="text-fg font-mono">{formatZAR(centsToRand(totalWorth))}</span>{" "}
          across {wishes.length} {wishes.length === 1 ? "item" : "items"}
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus /> New wish
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((wish) => (
          <WishCard
            key={wish.id}
            wish={wish}
            goal={goalByName.get(wish.name) ?? null}
            onEdit={() => setEditing(wish)}
          />
        ))}
      </div>

      <WishModal
        open={creating || editing !== null}
        onOpenChange={(o) => !o && closeModal()}
        wish={editing}
      />
    </div>
  );
}

function WishCard({
  wish,
  goal,
  onEdit,
}: {
  wish: Wish;
  goal: Goal | null;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const high = wish.priority === "high";
  const percent = goal ? goalPercent(goal.currentAmount, goal.targetAmount) : null;

  function save() {
    startTransition(async () => {
      try {
        await saveForWish(wish.id);
        router.push("/money/goals");
      } catch {
        toast.error("Could not start saving");
      }
    });
  }

  return (
    <div
      onClick={onEdit}
      className="bg-surface hover:bg-surface-2 hover:border-border-2 flex cursor-pointer flex-col gap-3 rounded-lg border p-4 transition-all hover:-translate-y-px"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.10em]",
            high ? "text-fg-2" : "text-fg-3",
          )}
        >
          {high ? <Star className="size-3" /> : null}
          {wish.priority}
        </span>
        <span className="bg-surface-3 text-fg-2 rounded-full px-2 py-0.5 text-xs">
          {wish.category}
        </span>
      </div>

      <p className="text-fg truncate text-lg font-semibold">{wish.name}</p>
      {wish.note ? (
        <p className="text-fg-2 line-clamp-2 text-sm">{wish.note}</p>
      ) : null}

      <p className="text-fg mt-auto font-mono text-xl font-medium">
        {formatZAR(centsToRand(wish.price))}
      </p>

      {goal ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push("/money/goals");
          }}
          className="bg-accent-soft text-accent-read border-accent-line flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm"
        >
          <Target className="size-4" />
          Saving{percent !== null ? ` · ${percent}%` : ""}
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={(e) => {
            e.stopPropagation();
            save();
          }}
          className="bg-surface-2 text-fg-2 hover:bg-accent-soft hover:text-accent-read hover:border-accent-line flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm transition-colors"
        >
          <Sparkles className="size-4" />
          Save for this
        </button>
      )}
    </div>
  );
}
