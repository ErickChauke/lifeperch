"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Pencil,
  Trash2,
  Plus,
  Star,
  Sparkles,
  Target,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";
import { priorityRank } from "@/lib/wishlist";
import { goalPercent } from "@/lib/goals";
import { WishModal } from "./wish-modal";
import {
  renameCollection,
  deleteCollection,
  saveForWish,
  toggleWishComplete,
} from "@/actions/wishlist";
import type { getCollection } from "@/actions/wishlist";
import type { getGoals } from "@/actions/goals";

type CollectionDetail = NonNullable<Awaited<ReturnType<typeof getCollection>>>;
export type Wish = CollectionDetail["items"][number];
type Goal = Awaited<ReturnType<typeof getGoals>>[number];

export function CollectionDetailView({
  collection,
  goals,
}: {
  collection: CollectionDetail;
  goals: Goal[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Wish | null>(null);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(collection.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Bought wishes sink to the bottom; the rest sort by priority then price.
  const wishes = [...collection.items].sort(
    (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      priorityRank(a.priority) - priorityRank(b.priority) ||
      b.price - a.price,
  );
  const worth = collection.items.reduce((sum, w) => sum + w.price, 0);
  const bought = collection.items.filter((w) => w.completed).length;
  const goalByName = new Map(goals.map((g) => [g.name, g]));

  function saveRename() {
    const clean = titleDraft.trim();
    if (!clean) return;
    startTransition(async () => {
      try {
        await renameCollection(collection.id, clean);
        setRenaming(false);
      } catch {
        toast.error("Could not rename the list");
      }
    });
  }

  function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteCollection(collection.id);
        router.push("/money/wishlist");
      } catch {
        toast.error("Could not delete the list");
      }
    });
  }

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/money/wishlist"
        className="text-fg-3 hover:text-fg-2 inline-flex items-center gap-1 font-mono text-xs"
      >
        <ChevronLeft className="size-4" /> Wishlist
      </Link>

      <div className="flex items-center justify-between gap-3">
        {renaming ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              autoFocus
              className="h-9 max-w-sm text-xl font-semibold"
            />
            <Button size="sm" onClick={saveRename} disabled={pending}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="text-fg truncate text-2xl font-semibold">{collection.title}</h1>
            {collection.category ? (
              <span className="bg-surface-3 text-fg-2 shrink-0 rounded-full px-2 py-0.5 text-xs">
                {collection.category}
              </span>
            ) : null}
          </div>
        )}
        {!renaming ? (
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-fg-2 hidden font-mono text-sm sm:inline">
              worth {formatZAR(centsToRand(worth))} · {collection.items.length} items
              {bought > 0 ? ` · ${bought} bought` : ""}
            </span>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Rename list"
              onClick={() => {
                setTitleDraft(collection.title);
                setRenaming(true);
              }}
            >
              <Pencil className="text-fg-3 size-4" />
            </Button>
            <Button
              size="sm"
              variant={confirmDelete ? "destructive" : "ghost"}
              aria-label="Delete list"
              onClick={onDelete}
              disabled={pending}
            >
              {confirmDelete ? "Delete list?" : <Trash2 className="text-fg-3 size-4" />}
            </Button>
          </div>
        ) : null}
      </div>

      {collection.description ? (
        <p className="text-fg-2 text-sm">{collection.description}</p>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus /> New wish
        </Button>
      </div>

      {collection.items.length === 0 ? (
        <p className="text-fg-3 text-sm">
          Nothing in this list yet. Add the first thing you want.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishes.map((wish) => (
            <WishCard
              key={wish.id}
              wish={wish}
              goal={goalByName.get(wish.name) ?? null}
              onEdit={() => setEditing(wish)}
            />
          ))}
        </div>
      )}

      <WishModal
        open={creating || editing !== null}
        onOpenChange={(o) => !o && closeModal()}
        collectionId={collection.id}
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

  function toggleBought() {
    startTransition(async () => {
      try {
        await toggleWishComplete(wish.id);
        router.refresh();
      } catch {
        toast.error("Could not update the wish");
      }
    });
  }

  return (
    <div
      onClick={onEdit}
      className="bg-surface hover:border-border-2 flex cursor-pointer flex-col gap-3 rounded-lg border p-4 transition-all hover:-translate-y-px"
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
        <button
          type="button"
          disabled={pending}
          onClick={(e) => {
            e.stopPropagation();
            toggleBought();
          }}
          className={cn(
            "inline-flex items-center gap-1.5 font-mono text-xs transition-colors",
            wish.completed ? "text-accent-read" : "text-fg-3 hover:text-fg-2",
          )}
        >
          {wish.completed ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Circle className="size-4" />
          )}
          {wish.completed ? "Bought" : "Mark bought"}
        </button>
      </div>

      <div className={cn("flex flex-1 flex-col gap-3", wish.completed && "opacity-50")}>
        <p className="text-fg truncate text-lg font-semibold">{wish.name}</p>
        {wish.note ? <p className="text-fg-2 line-clamp-2 text-sm">{wish.note}</p> : null}

        <p className="text-fg mt-auto font-mono text-xl font-medium">
          {formatZAR(centsToRand(wish.price))}
        </p>
      </div>

      {wish.completed ? null : goal ? (
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
