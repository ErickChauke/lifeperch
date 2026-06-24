"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { dayToDate, dateToDay } from "@/lib/money";
import {
  todoSchema,
  todoCollectionSchema,
  isOverdue,
  bucketOf,
  isDone,
  type TodoInput,
  type TodoCollectionInput,
} from "@/lib/todo";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Revalidates every surface a todo appears on after a write, plus the project
// detail page when one is given.
function revalidateTodo(id?: string) {
  revalidatePath("/todo");
  revalidatePath("/dashboard");
  revalidatePath("/timetable");
  if (id) revalidatePath(`/todo/${id}`);
}

// Maps validated form input to the fields stored on a Todo. specificDate clears
// when recurring, dayOfWeek clears when not, empty strings become null and tags
// are trimmed. status and completedAt are owned by toggleTodo, not this mapper.
function toRecord(data: TodoInput) {
  return {
    title: data.title,
    notes: data.notes || null,
    priority: data.priority,
    tags: data.tags.map((t) => t.trim()).filter(Boolean),
    isRecurring: data.isRecurring,
    dayOfWeek: data.isRecurring ? data.dayOfWeek : null,
    specificDate:
      !data.isRecurring && data.specificDate ? dayToDate(data.specificDate) : null,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    linkedModule: data.linkedModule || null,
    linkedId: data.linkedId || null,
    linkedLabel: data.linkedLabel || null,
  };
}

const TODO_ORDER = [
  { specificDate: "asc" as const },
  { startTime: "asc" as const },
  { createdAt: "asc" as const },
];

// --- Projects (collections) ---

// Fetches the user's projects, newest first, with their todo counts.
export async function getCollections() {
  const userId = await requireUserId();
  return prisma.todoCollection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { todos: true } } },
  });
}

// Fetches one project and its todos (by date then time), scoped to the user.
export async function getCollection(id: string) {
  const userId = await requireUserId();
  const collection = await prisma.todoCollection.findFirst({
    where: { id, userId },
  });
  if (!collection) return null;
  const todos = await prisma.todo.findMany({
    where: { userId, collectionId: id },
    orderBy: TODO_ORDER,
  });
  return { ...collection, todos };
}

// Creates a project and returns it so the UI can navigate into it.
export async function createCollection(input: TodoCollectionInput) {
  const userId = await requireUserId();
  const data = todoCollectionSchema.parse(input);
  const collection = await prisma.todoCollection.create({
    data: {
      userId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
    },
  });
  revalidateTodo(collection.id);
  return collection;
}

// Renames a project.
export async function renameCollection(id: string, title: string) {
  const userId = await requireUserId();
  const clean = title.trim();
  if (!clean) return;
  await prisma.todoCollection.updateMany({
    where: { id, userId },
    data: { title: clean },
  });
  revalidateTodo(id);
}

// Updates a project's description (empty clears it).
export async function updateCollectionDescription(id: string, description: string) {
  const userId = await requireUserId();
  await prisma.todoCollection.updateMany({
    where: { id, userId },
    data: { description: description.trim() || null },
  });
  revalidateTodo(id);
}

// Deletes a project and its todos.
export async function deleteCollection(id: string) {
  const userId = await requireUserId();
  await prisma.todoCollection.deleteMany({ where: { id, userId } });
  revalidateTodo();
}

// --- Todos ---

// Fetches all todos for the current user, ordered by date then time. Used by the
// timetable, which spans every project.
export async function getTodos() {
  const userId = await requireUserId();
  return prisma.todo.findMany({ where: { userId }, orderBy: TODO_ORDER });
}

// Returns the dashboard slices for a given user: todos due today and overdue
// one-offs. Session-free so the digest cron can call it with an explicit user id.
// Spans every project.
export async function getTodayTodosForUser(userId: string) {
  const todos = await prisma.todo.findMany({
    where: { userId },
    orderBy: TODO_ORDER,
  });
  const today = dateToDay(new Date());
  const overdue = todos.filter((t) => isOverdue(t, today));
  const due = todos.filter(
    (t) => !isOverdue(t, today) && bucketOf(t, today) === "today",
  );
  return { today: due, overdue };
}

// Returns the dashboard slices: todos due today and overdue one-offs.
export async function getTodayTodos() {
  const userId = await requireUserId();
  return getTodayTodosForUser(userId);
}

// Captures a todo without a chosen project, for the dashboard quick-add. It
// lands in the user's oldest project, creating a "General" project if none yet.
export async function quickAddTodo(input: TodoInput) {
  const userId = await requireUserId();
  let project = await prisma.todoCollection.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (!project) {
    project = await prisma.todoCollection.create({
      data: { userId, title: "General" },
    });
  }
  const data = todoSchema.parse(input);
  await prisma.todo.create({
    data: { userId, collectionId: project.id, ...toRecord(data) },
  });
  revalidateTodo(project.id);
}

// Creates a new todo inside a project the user owns.
export async function createTodo(collectionId: string, input: TodoInput) {
  const userId = await requireUserId();
  const collection = await prisma.todoCollection.findFirst({
    where: { id: collectionId, userId },
  });
  if (!collection) throw new Error("Project not found");
  const data = todoSchema.parse(input);
  await prisma.todo.create({ data: { userId, collectionId, ...toRecord(data) } });
  revalidateTodo(collectionId);
}

// Updates a todo, scoped to the current user so others cannot be touched.
export async function updateTodo(id: string, input: TodoInput) {
  const userId = await requireUserId();
  const data = todoSchema.parse(input);
  const existing = await prisma.todo.findFirst({ where: { id, userId } });
  if (!existing) return;
  await prisma.todo.updateMany({ where: { id, userId }, data: toRecord(data) });
  revalidateTodo(existing.collectionId);
}

// Flips a todo between done and pending, stamping or clearing completedAt. The
// current done state is derived so a recurring todo done yesterday marks done
// today rather than reverting.
export async function toggleTodo(id: string) {
  const userId = await requireUserId();
  const todo = await prisma.todo.findFirst({ where: { id, userId } });
  if (!todo) return;
  const done = isDone(todo, dateToDay(new Date()));
  await prisma.todo.updateMany({
    where: { id, userId },
    data: done
      ? { status: "pending", completedAt: null }
      : { status: "done", completedAt: new Date() },
  });
  revalidateTodo(todo.collectionId);
}

// Deletes a todo, scoped to the current user.
export async function deleteTodo(id: string) {
  const userId = await requireUserId();
  const existing = await prisma.todo.findFirst({ where: { id, userId } });
  if (!existing) return;
  await prisma.todo.deleteMany({ where: { id, userId } });
  revalidateTodo(existing.collectionId);
}
