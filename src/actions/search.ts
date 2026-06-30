"use server";

import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isVaultUnlocked } from "@/actions/vault";
import { formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";

// One row in the global command palette. moduleId drives the group icon/label;
// href is the deep link the result navigates to.
export type SearchResult = {
  id: string;
  moduleId: string;
  title: string;
  subtitle?: string;
  href: string;
};

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// A case-insensitive contains filter for a single text field.
function ci(q: string) {
  return { contains: q, mode: "insensitive" as const };
}

const TAKE = 5;
const DATE_FMT = "d MMM yyyy";

// Searches every module for the current user and returns a flat, grouped-ready
// list of results. Empty for queries under two characters.
export async function searchEverything(query: string): Promise<SearchResult[]> {
  const userId = await requireUserId();
  const q = query.trim();
  if (q.length < 2) return [];

  const unlocked = await isVaultUnlocked();

  const [
    todos,
    todoCollections,
    notes,
    noteCollections,
    journal,
    transactions,
    goals,
    budgetPlans,
    budgetItems,
    shoppingLists,
    shoppingItems,
    wishlistCollections,
    wishlistItems,
    jobs,
    papers,
    literatureCollections,
    milestones,
    habits,
    events,
    mealPlans,
    workoutRoutines,
    workoutSessions,
    medicines,
    healthRules,
    healthNotes,
  ] = await Promise.all([
    prisma.todo.findMany({
      where: { userId, OR: [{ title: ci(q) }, { notes: ci(q) }] },
      select: { id: true, title: true, collection: { select: { title: true } } },
      take: TAKE,
    }),
    prisma.todoCollection.findMany({
      where: { userId, OR: [{ title: ci(q) }, { description: ci(q) }] },
      select: { id: true, title: true, description: true },
      take: TAKE,
    }),
    prisma.note.findMany({
      where: { userId, OR: [{ title: ci(q) }, { body: ci(q) }] },
      select: {
        id: true,
        title: true,
        collectionId: true,
        collection: { select: { title: true } },
      },
      take: TAKE,
    }),
    prisma.noteCollection.findMany({
      where: { userId, OR: [{ title: ci(q) }, { description: ci(q) }] },
      select: { id: true, title: true, description: true },
      take: TAKE,
    }),
    prisma.dailyEntry.findMany({
      where: { userId, OR: [{ title: ci(q) }, { body: ci(q) }] },
      select: { id: true, title: true, date: true },
      take: TAKE,
    }),
    prisma.transaction.findMany({
      where: { userId, OR: [{ description: ci(q) }, { category: ci(q) }] },
      select: { id: true, description: true, category: true, amount: true },
      take: TAKE,
    }),
    prisma.savingsGoal.findMany({
      where: { userId, name: ci(q) },
      select: { id: true, name: true, targetAmount: true },
      take: TAKE,
    }),
    prisma.budgetPlan.findMany({
      where: { userId, title: ci(q) },
      select: { id: true, title: true },
      take: TAKE,
    }),
    prisma.budgetItem.findMany({
      where: {
        userId,
        OR: [{ title: ci(q) }, { note: ci(q) }, { category: ci(q) }],
      },
      select: { id: true, title: true, category: true, planId: true },
      take: TAKE,
    }),
    prisma.shoppingList.findMany({
      where: { userId, OR: [{ title: ci(q) }, { category: ci(q) }] },
      select: { id: true, title: true, category: true },
      take: TAKE,
    }),
    prisma.shoppingItem.findMany({
      where: { userId, name: ci(q) },
      select: {
        id: true,
        name: true,
        listId: true,
        list: { select: { title: true } },
      },
      take: TAKE,
    }),
    prisma.wishlistCollection.findMany({
      where: {
        userId,
        OR: [{ title: ci(q) }, { description: ci(q) }, { category: ci(q) }],
      },
      select: { id: true, title: true, category: true },
      take: TAKE,
    }),
    prisma.wishlistItem.findMany({
      where: { userId, OR: [{ name: ci(q) }, { note: ci(q) }] },
      select: {
        id: true,
        name: true,
        collectionId: true,
        collection: { select: { title: true } },
      },
      take: TAKE,
    }),
    prisma.jobApplication.findMany({
      where: {
        userId,
        OR: [
          { organisation: ci(q) },
          { position: ci(q) },
          { location: ci(q) },
          { description: ci(q) },
        ],
      },
      select: { id: true, organisation: true, position: true, location: true },
      take: TAKE,
    }),
    prisma.literature.findMany({
      where: {
        userId,
        OR: [{ title: ci(q) }, { authors: ci(q) }, { notes: ci(q) }],
      },
      select: { id: true, title: true, authors: true, collectionId: true },
      take: TAKE,
    }),
    prisma.literatureCollection.findMany({
      where: { userId, OR: [{ title: ci(q) }, { description: ci(q) }] },
      select: { id: true, title: true, description: true },
      take: TAKE,
    }),
    prisma.milestone.findMany({
      where: { userId, OR: [{ title: ci(q) }, { description: ci(q) }] },
      select: { id: true, title: true, targetDate: true },
      take: TAKE,
    }),
    prisma.habit.findMany({
      where: {
        userId,
        archived: false,
        OR: [{ name: ci(q) }, { description: ci(q) }],
      },
      select: { id: true, name: true, description: true },
      take: TAKE,
    }),
    prisma.timetableEvent.findMany({
      where: {
        userId,
        OR: [{ title: ci(q) }, { notes: ci(q) }, { location: ci(q) }],
      },
      select: { id: true, title: true, location: true, type: true },
      take: TAKE,
    }),
    prisma.mealPlan.findMany({
      where: { userId, OR: [{ name: ci(q) }, { notes: ci(q) }] },
      select: { id: true, name: true },
      take: TAKE,
    }),
    prisma.workoutRoutine.findMany({
      where: { userId, OR: [{ name: ci(q) }, { notes: ci(q) }] },
      select: { id: true, name: true },
      take: TAKE,
    }),
    prisma.workoutSession.findMany({
      where: { userId, OR: [{ name: ci(q) }, { notes: ci(q) }] },
      select: { id: true, name: true, date: true },
      take: TAKE,
    }),
    prisma.medicine.findMany({
      where: {
        userId,
        OR: [{ name: ci(q) }, { dose: ci(q) }, { schedule: ci(q) }],
      },
      select: { id: true, name: true, dose: true },
      take: TAKE,
    }),
    prisma.healthRule.findMany({
      where: { userId, OR: [{ text: ci(q) }, { category: ci(q) }] },
      select: { id: true, text: true, category: true },
      take: TAKE,
    }),
    prisma.healthNote.findMany({
      where: { userId, body: ci(q) },
      select: { id: true, body: true, date: true },
      take: TAKE,
    }),
  ]);

  const results: SearchResult[] = [];

  for (const t of todos) {
    results.push({
      id: t.id,
      moduleId: "todo",
      title: t.title,
      subtitle: t.collection?.title,
      href: "/todo",
    });
  }
  for (const c of todoCollections) {
    results.push({
      id: c.id,
      moduleId: "todo",
      title: c.title,
      subtitle: c.description ?? "Project",
      href: `/todo/${c.id}`,
    });
  }
  for (const n of notes) {
    results.push({
      id: n.id,
      moduleId: "notes",
      title: n.title,
      subtitle: n.collection?.title,
      href: `/notes/${n.collectionId}`,
    });
  }
  for (const c of noteCollections) {
    results.push({
      id: c.id,
      moduleId: "notes",
      title: c.title,
      subtitle: c.description ?? "Notebook",
      href: `/notes/${c.id}`,
    });
  }
  for (const e of journal) {
    results.push({
      id: e.id,
      moduleId: "journal",
      title: e.title || "Journal entry",
      subtitle: format(e.date, DATE_FMT),
      href: "/journal",
    });
  }
  for (const t of transactions) {
    results.push({
      id: t.id,
      moduleId: "money",
      title: t.description || t.category,
      subtitle: `${t.category} · ${formatZAR(centsToRand(t.amount))}`,
      href: "/money/transactions",
    });
  }
  for (const g of goals) {
    results.push({
      id: g.id,
      moduleId: "money",
      title: g.name,
      subtitle: `Goal · ${formatZAR(centsToRand(g.targetAmount))}`,
      href: "/money/goals",
    });
  }
  for (const p of budgetPlans) {
    results.push({
      id: p.id,
      moduleId: "money",
      title: p.title,
      subtitle: "Budget plan",
      href: `/money/plan/${p.id}`,
    });
  }
  for (const i of budgetItems) {
    results.push({
      id: i.id,
      moduleId: "money",
      title: i.title || i.category,
      subtitle: `Budget line · ${i.category}`,
      href: `/money/plan/${i.planId}`,
    });
  }
  for (const l of shoppingLists) {
    results.push({
      id: l.id,
      moduleId: "money",
      title: l.title,
      subtitle: `Shopping · ${l.category}`,
      href: `/money/shopping/${l.id}`,
    });
  }
  for (const i of shoppingItems) {
    results.push({
      id: i.id,
      moduleId: "money",
      title: i.name,
      subtitle: i.list?.title,
      href: `/money/shopping/${i.listId}`,
    });
  }
  for (const c of wishlistCollections) {
    results.push({
      id: c.id,
      moduleId: "money",
      title: c.title,
      subtitle: c.category ?? "Wishlist",
      href: `/money/wishlist/${c.id}`,
    });
  }
  for (const i of wishlistItems) {
    results.push({
      id: i.id,
      moduleId: "money",
      title: i.name,
      subtitle: i.collection?.title,
      href: `/money/wishlist/${i.collectionId}`,
    });
  }
  for (const j of jobs) {
    results.push({
      id: j.id,
      moduleId: "jobs",
      title: j.position,
      subtitle: [j.organisation, j.location].filter(Boolean).join(" · "),
      href: "/jobs",
    });
  }
  for (const p of papers) {
    results.push({
      id: p.id,
      moduleId: "literature",
      title: p.title,
      subtitle: p.authors || undefined,
      href: `/literature/${p.collectionId}`,
    });
  }
  for (const c of literatureCollections) {
    results.push({
      id: c.id,
      moduleId: "literature",
      title: c.title,
      subtitle: c.description ?? "Topic",
      href: `/literature/${c.id}`,
    });
  }
  for (const m of milestones) {
    results.push({
      id: m.id,
      moduleId: "timeline",
      title: m.title,
      subtitle: format(m.targetDate, DATE_FMT),
      href: "/timeline",
    });
  }
  for (const h of habits) {
    results.push({
      id: h.id,
      moduleId: "habits",
      title: h.name,
      subtitle: h.description ?? undefined,
      href: "/habits",
    });
  }
  for (const e of events) {
    results.push({
      id: e.id,
      moduleId: "timetable",
      title: e.title,
      subtitle: [e.type, e.location].filter(Boolean).join(" · ") || undefined,
      href: "/timetable",
    });
  }
  for (const p of mealPlans) {
    results.push({
      id: p.id,
      moduleId: "health",
      title: p.name,
      subtitle: "Meal plan",
      href: "/health",
    });
  }
  for (const r of workoutRoutines) {
    results.push({
      id: r.id,
      moduleId: "health",
      title: r.name,
      subtitle: "Routine",
      href: "/health",
    });
  }
  for (const s of workoutSessions) {
    results.push({
      id: s.id,
      moduleId: "health",
      title: s.name,
      subtitle: `Workout · ${format(s.date, DATE_FMT)}`,
      href: "/health",
    });
  }
  for (const m of medicines) {
    results.push({
      id: m.id,
      moduleId: "health",
      title: m.name,
      subtitle: m.dose ?? "Medicine",
      href: "/health",
    });
  }
  for (const r of healthRules) {
    results.push({
      id: r.id,
      moduleId: "health",
      title: r.text,
      subtitle: r.category ?? "Rule",
      href: "/health",
    });
  }
  for (const n of healthNotes) {
    results.push({
      id: n.id,
      moduleId: "health",
      title: n.body.length > 60 ? `${n.body.slice(0, 60)}…` : n.body,
      subtitle: `Note · ${format(n.date, DATE_FMT)}`,
      href: "/health",
    });
  }

  if (unlocked) {
    const [vaultCollections, documents] = await Promise.all([
      prisma.vaultCollection.findMany({
        where: { userId, OR: [{ title: ci(q) }, { description: ci(q) }] },
        select: { id: true, title: true, description: true },
        take: TAKE,
      }),
      prisma.document.findMany({
        where: { userId, title: ci(q) },
        select: {
          id: true,
          title: true,
          collectionId: true,
          collection: { select: { title: true } },
        },
        take: TAKE,
      }),
    ]);
    for (const c of vaultCollections) {
      results.push({
        id: c.id,
        moduleId: "vault",
        title: c.title,
        subtitle: c.description ?? "Vault card",
        href: `/vault/${c.id}`,
      });
    }
    for (const d of documents) {
      results.push({
        id: d.id,
        moduleId: "vault",
        title: d.title,
        subtitle: d.collection?.title,
        href: `/vault/${d.collectionId}`,
      });
    }
  }

  return results;
}
