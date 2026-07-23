import { describe, it, expect, beforeEach, vi } from "vitest";
import { subDays } from "date-fns";

// Auto clean permanently deletes todos, so the filter it builds is the whole
// safety story. The fake records the where clause and applies it to rows, so the
// assertions are about which todos actually survive.

type TodoRow = {
  id: string;
  userId: string;
  isRecurring: boolean;
  status: string;
  completedAt: Date | null;
};

const { db, client } = vi.hoisted(() => {
  const db: { todos: TodoRow[] } = { todos: [] };

  type Where = {
    userId: string;
    isRecurring: boolean;
    status: string;
    completedAt: { lt: Date };
  };

  const client = {
    todo: {
      deleteMany: async ({ where }: { where: Where }) => {
        const doomed = db.todos.filter(
          (t) =>
            t.userId === where.userId &&
            t.isRecurring === where.isRecurring &&
            t.status === where.status &&
            t.completedAt !== null &&
            t.completedAt < where.completedAt.lt,
        );
        db.todos = db.todos.filter((t) => !doomed.includes(t));
        return { count: doomed.length };
      },
    },
  };

  return { db, client };
});

vi.mock("@/lib/prisma", () => ({ prisma: client }));

const { cleanupCompletedTodos } = await import("@/lib/todo-cleanup");
const {
  parseCleanupDays,
  cleanupLabel,
  isCleanupDays,
  CLEANUP_DAYS,
  DEFAULT_CLEANUP_DAYS,
} = await import("@/lib/todo");

const USER = "user-1";

function todo(over: Partial<TodoRow> & { id: string }): TodoRow {
  return {
    userId: USER,
    isRecurring: false,
    status: "done",
    completedAt: subDays(new Date(), 10),
    ...over,
  };
}

const surviving = () => db.todos.map((t) => t.id).sort();

beforeEach(() => {
  db.todos = [];
});

describe("cleanupCompletedTodos", () => {
  it("removes a one-off finished longer ago than the window", async () => {
    db.todos = [todo({ id: "old", completedAt: subDays(new Date(), 5) })];
    const removed = await cleanupCompletedTodos(USER, 3);
    expect(removed).toBe(1);
    expect(surviving()).toEqual([]);
  });

  it("keeps one finished inside the window", async () => {
    db.todos = [todo({ id: "recent", completedAt: subDays(new Date(), 1) })];
    const removed = await cleanupCompletedTodos(USER, 3);
    expect(removed).toBe(0);
    expect(surviving()).toEqual(["recent"]);
  });

  // Deleting a recurring todo would not clear a stale row, it would end the
  // repeat. Its done state is only ever scoped to the day it was ticked.
  it("never touches a recurring todo, however long ago it was ticked", async () => {
    db.todos = [
      todo({ id: "repeat", isRecurring: true, completedAt: subDays(new Date(), 400) }),
    ];
    const removed = await cleanupCompletedTodos(USER, 1);
    expect(removed).toBe(0);
    expect(surviving()).toEqual(["repeat"]);
  });

  it("leaves unfinished todos alone no matter their age", async () => {
    db.todos = [
      todo({ id: "pending", status: "pending", completedAt: subDays(new Date(), 99) }),
    ];
    await cleanupCompletedTodos(USER, 1);
    expect(surviving()).toEqual(["pending"]);
  });

  it("skips a done todo with no completedAt rather than guessing its age", async () => {
    db.todos = [todo({ id: "undated", completedAt: null })];
    const removed = await cleanupCompletedTodos(USER, 1);
    expect(removed).toBe(0);
    expect(surviving()).toEqual(["undated"]);
  });

  it("does nothing at all when the window is Never", async () => {
    db.todos = [todo({ id: "ancient", completedAt: subDays(new Date(), 999) })];
    const removed = await cleanupCompletedTodos(USER, null);
    expect(removed).toBe(0);
    expect(surviving()).toEqual(["ancient"]);
  });

  it("leaves another account's todos alone", async () => {
    db.todos = [todo({ id: "theirs", userId: "user-2" })];
    const removed = await cleanupCompletedTodos(USER, 1);
    expect(removed).toBe(0);
    expect(surviving()).toEqual(["theirs"]);
  });

  it("clears only what has aged out of a mixed list", async () => {
    db.todos = [
      todo({ id: "old-1", completedAt: subDays(new Date(), 30) }),
      todo({ id: "old-2", completedAt: subDays(new Date(), 8) }),
      todo({ id: "fresh", completedAt: subDays(new Date(), 2) }),
      todo({ id: "repeat", isRecurring: true, completedAt: subDays(new Date(), 30) }),
      todo({ id: "open", status: "pending", completedAt: null }),
    ];
    const removed = await cleanupCompletedTodos(USER, 7);
    expect(removed).toBe(2);
    expect(surviving()).toEqual(["fresh", "open", "repeat"]);
  });
});

describe("retention options", () => {
  it("defaults to three days", () => {
    expect(DEFAULT_CLEANUP_DAYS).toBe(3);
    expect(isCleanupDays(DEFAULT_CLEANUP_DAYS)).toBe(true);
  });

  it("reads the Never option back as null", () => {
    expect(parseCleanupDays("")).toBeNull();
  });

  it("reads every offered window back to its number", () => {
    for (const days of CLEANUP_DAYS) {
      expect(parseCleanupDays(String(days))).toBe(days);
    }
  });

  it("refuses a window the form does not offer", () => {
    expect(isCleanupDays(2)).toBe(false);
    expect(parseCleanupDays("2")).toBeNull();
    expect(parseCleanupDays("banana")).toBeNull();
  });

  it("keeps the label singular for one day", () => {
    expect(cleanupLabel(1)).toBe("After 1 day");
    expect(cleanupLabel(3)).toBe("After 3 days");
    expect(cleanupLabel(null)).toBe("Never");
  });
});
