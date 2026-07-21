import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { settleItem, unsettleItem } from "@/lib/settle";

// Cross-module item links. The three "things to buy" (wishlist items, shopping
// items, plan expense lines) carry an originType/originId pointer to the row they
// were imported from. Status mirrors across the whole linked group in both
// directions, and only the item the user actually toggles ever owns a
// transaction, so the same purchase is never recorded twice.

export type LinkType = "wish" | "shopping" | "plan";

function isLinkType(value: string | null): value is LinkType {
  return value === "wish" || value === "shopping" || value === "plan";
}

// Returns the origin pointer of a single node, scoped to the user.
async function originOf(userId: string, type: LinkType, id: string) {
  const where = { id, userId };
  const select = { originType: true, originId: true };
  if (type === "wish") return prisma.wishlistItem.findFirst({ where, select });
  if (type === "shopping") return prisma.shoppingItem.findFirst({ where, select });
  return prisma.budgetItem.findFirst({ where, select });
}

// Returns ids of rows of the given type that point AT (originType,originId).
async function inboundOf(userId: string, type: LinkType, originType: LinkType, originId: string) {
  const where = { userId, originType, originId };
  const select = { id: true };
  if (type === "wish") return prisma.wishlistItem.findMany({ where, select });
  if (type === "shopping") return prisma.shoppingItem.findMany({ where, select });
  return prisma.budgetItem.findMany({ where, select });
}

// Walks the link graph both ways (a node's own origin plus everything pulled from
// it) and returns the connected group keyed by type, excluding the start node. A
// visited set keeps it terminating even if the data ever formed a cycle.
async function collectGroup(userId: string, startType: LinkType, startId: string) {
  const seen = new Set<string>([`${startType}:${startId}`]);
  const queue: { type: LinkType; id: string }[] = [{ type: startType, id: startId }];
  const out = { wish: new Set<string>(), shopping: new Set<string>(), plan: new Set<string>() };

  while (queue.length) {
    const node = queue.shift()!;
    const neighbours: { type: LinkType; id: string }[] = [];

    const self = await originOf(userId, node.type, node.id);
    if (self?.originId && isLinkType(self.originType)) {
      neighbours.push({ type: self.originType, id: self.originId });
    }
    for (const t of ["wish", "shopping", "plan"] as LinkType[]) {
      const rows = await inboundOf(userId, t, node.type, node.id);
      for (const r of rows) neighbours.push({ type: t, id: r.id });
    }

    for (const n of neighbours) {
      const key = `${n.type}:${n.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out[n.type].add(n.id);
      queue.push(n);
    }
  }

  return out;
}

// Mirrors a done/bought toggle across the linked group. The toggled item keeps
// whatever its own action did (including its transaction); neighbours only have
// their flag set, and any neighbour-owned transaction is cleared so the group
// holds exactly one transaction (the toggled item's). Revalidates every touched
// detail and overview path.
export async function syncLinkedStatus(
  userId: string,
  type: LinkType,
  id: string,
  done: boolean,
) {
  const group = await collectGroup(userId, type, id);
  const wishIds = [...group.wish];
  const shopIds = [...group.shopping];
  const planIds = [...group.plan];

  if (wishIds.length) {
    const rows = await prisma.wishlistItem.findMany({
      where: { userId, id: { in: wishIds } },
      select: { id: true, collectionId: true, transactionId: true },
    });
    const txnIds = rows.map((r) => r.transactionId).filter((t): t is string => !!t);
    if (txnIds.length) {
      await prisma.transaction.deleteMany({ where: { userId, id: { in: txnIds } } });
    }
    await prisma.wishlistItem.updateMany({
      where: { userId, id: { in: wishIds } },
      data: { completed: done, transactionId: null },
    });
    for (const r of rows) revalidatePath(`/money/wishlist/${r.collectionId}`);
  }

  if (planIds.length) {
    const rows = await prisma.budgetItem.findMany({
      where: { userId, id: { in: planIds } },
      select: {
        id: true,
        planId: true,
        transactionId: true,
        completed: true,
        loanId: true,
        goalId: true,
        amount: true,
      },
    });
    const txnIds = rows.map((r) => r.transactionId).filter((t): t is string => !!t);
    if (txnIds.length) {
      await prisma.transaction.deleteMany({ where: { userId, id: { in: txnIds } } });
    }
    // A neighbour line flipped through a link moves money exactly as one toggled
    // directly does, so a loan or goal it targets stays in step. Only lines
    // actually changing state settle, so mirroring a flag twice cannot double up.
    for (const r of rows) {
      if (r.completed === done) continue;
      if (done) await settleItem(userId, r);
      else await unsettleItem(userId, r);
    }
    await prisma.budgetItem.updateMany({
      where: { userId, id: { in: planIds } },
      data: { completed: done, transactionId: null },
    });
    for (const r of rows) revalidatePath(`/money/plan/${r.planId}`);
    revalidatePath("/money/loans");
    revalidatePath("/money/goals");
  }

  if (shopIds.length) {
    const rows = await prisma.shoppingItem.findMany({
      where: { userId, id: { in: shopIds } },
      select: { id: true, listId: true, transactionId: true },
    });
    const txnIds = rows.map((r) => r.transactionId).filter((t): t is string => !!t);
    if (txnIds.length) {
      await prisma.transaction.deleteMany({ where: { userId, id: { in: txnIds } } });
    }
    await prisma.shoppingItem.updateMany({
      where: { userId, id: { in: shopIds } },
      data: { bought: done, transactionId: null },
    });
    for (const r of rows) revalidatePath(`/money/shopping/${r.listId}`);
  }

  if (wishIds.length + shopIds.length + planIds.length > 0) {
    revalidatePath("/money");
    revalidatePath("/money/transactions");
    revalidatePath("/money/wishlist");
    revalidatePath("/money/shopping");
    revalidatePath("/money/plan");
  }
}

// Severs links pointing at a deleted row so its imported copies do not dangle.
// The copies keep their own status; only the link is cleared.
export async function clearInboundLinks(userId: string, deletedId: string) {
  const data = { originType: null, originId: null };
  await prisma.wishlistItem.updateMany({ where: { userId, originId: deletedId }, data });
  await prisma.shoppingItem.updateMany({ where: { userId, originId: deletedId }, data });
  await prisma.budgetItem.updateMany({ where: { userId, originId: deletedId }, data });
}
