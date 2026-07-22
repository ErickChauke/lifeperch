import { describe, it, expect } from "vitest";
import { buildDigestEmail } from "@/lib/digest";
import { titleCaseName } from "@/lib/utils";
import type { Todo } from "@/generated/prisma/client";

// Minimal Todo shaped for the digest: it only reads title, priority, times and
// recurrence, so the rest is stubbed.
function todo(title: string): Todo {
  return {
    title,
    priority: "normal",
    startTime: null,
    endTime: null,
    isRecurring: false,
    dayOfWeek: null,
  } as unknown as Todo;
}

describe("titleCaseName", () => {
  it("upper-cases the first letter of each word", () => {
    expect(titleCaseName("erick chauke")).toBe("Erick Chauke");
  });

  it("normalises shouting to title case", () => {
    expect(titleCaseName("ERICK")).toBe("Erick");
  });

  it("returns empty for a blank or whitespace name", () => {
    expect(titleCaseName("")).toBe("");
    expect(titleCaseName("   ")).toBe("");
  });
});

describe("buildDigestEmail subject", () => {
  it("keeps the noun singular for one todo", () => {
    expect(buildDigestEmail("erick", [todo("a")], []).subject).toBe("1 todo today");
  });

  it("pluralises for several todos", () => {
    expect(buildDigestEmail("erick", [todo("a"), todo("b")], []).subject).toBe(
      "2 todos today",
    );
  });

  it("leads with overdue when there is any", () => {
    expect(buildDigestEmail("erick", [todo("a")], [todo("x"), todo("y")]).subject).toBe(
      "2 todos overdue, 1 today",
    );
  });

  it("reads all clear when nothing is due", () => {
    expect(buildDigestEmail("erick", [], []).subject).toBe("You're all clear today");
  });
});

describe("buildDigestEmail greeting", () => {
  it("title-cases the name in the body", () => {
    expect(buildDigestEmail("erick chauke", [todo("a")], []).html).toContain(
      "Good morning, Erick Chauke",
    );
  });

  it("falls back to there for a missing name", () => {
    expect(buildDigestEmail("", [todo("a")], []).html).toContain("Good morning, there");
  });
});
