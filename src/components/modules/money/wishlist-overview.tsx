"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";
import { MoneyEmpty } from "./money-empty";
import { CollectionModal } from "./collection-modal";
import type { getCollections } from "@/actions/wishlist";
import type { getGoals } from "@/actions/goals";

export type CollectionWithItems = Awaited<ReturnType<typeof getCollections>>[number];
type Goal = Awaited<ReturnType<typeof getGoals>>[number];

export function WishlistOverview({
  collections,
  goals,
}: {
  collections: CollectionWithItems[];
  goals: Goal[];
}) {
  const [creating, setCreating] = useState(false);
  const goalNames = new Set(goals.map((g) => g.name));

  const totalWorth = collections.reduce(
    (sum, c) => sum + c.items.reduce((s, w) => s + w.price, 0),
    0,
  );

  if (collections.length === 0) {
    return (
      <>
        <MoneyEmpty
          eyebrow="Records · Money · Wishlist"
          message="No wishlists yet. Make a collection for the things you want - a camera kit, a home office - and price them up."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> New collection
            </Button>
          }
        />
        <CollectionModal open={creating} onOpenChange={setCreating} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-fg-2 text-sm">
          {collections.length} {collections.length === 1 ? "collection" : "collections"} · worth{" "}
          <span className="text-fg font-mono">{formatZAR(centsToRand(totalWorth))}</span>
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus /> New collection
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} goalNames={goalNames} />
        ))}
      </div>

      <CollectionModal open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function CollectionCard({
  collection,
  goalNames,
}: {
  collection: CollectionWithItems;
  goalNames: Set<string>;
}) {
  const worth = collection.items.reduce((s, w) => s + w.price, 0);
  const saving = collection.items.filter((w) => goalNames.has(w.name)).length;

  const meta =
    collection.items.length === 0
      ? "Empty collection"
      : `${collection.items.length} ${collection.items.length === 1 ? "item" : "items"}`;

  return (
    <Link
      href={`/money/wishlist/${collection.id}`}
      className="bg-surface hover:bg-surface-2 hover:border-border-2 focus-visible:border-accent-line flex flex-col gap-2 rounded-lg border p-4 transition-all hover:-translate-y-px"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-fg truncate font-semibold">{collection.title}</span>
        <span className="bg-surface-3 text-fg-2 shrink-0 rounded-full px-2 py-0.5 text-xs">
          {collection.category}
        </span>
      </div>
      <span className="text-fg font-mono text-2xl font-medium">
        {formatZAR(centsToRand(worth))}
      </span>
      <span className="text-fg-3 font-mono text-xs">
        {meta}
        {saving > 0 ? <span className="text-accent-read"> · {saving} saving</span> : null}
      </span>
    </Link>
  );
}
