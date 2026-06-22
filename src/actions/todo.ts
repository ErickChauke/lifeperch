"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { dayToDate, dateToDay } from "@/lib/money";
import { todoSchema, isOverdue, bucketOf, isDone, type TodoInput } from "@/lib/todo";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Revalidates every surface a todo appears on after a write.
function revalidateTodo() {
  revalidatePath("/todo");
  revalidatePath("/dashboard");
  revalidatePath("/timetable");
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

// Fetches all todos for the current user, ordered by date then time.
export async function getTodos() {
  const userId = await requireUserId();
  return prisma.todo.findMany({
    where: { userId },
    orderBy: [
      { specificDate: "asc" },
      { startTime: "asc" },
      { createdAt: "asc" },
    ],
  });
}

// Returns the dashboard slices: todos due today and overdue one-offs.
export async function getTodayTodos() {
  const todos = await getTodos();
  const today = dateToDay(new Date());
  const overdue = todos.filter((t) => isOverdue(t, today));
  const due = todos.filter(
    (t) => !isOverdue(t, today) && bucketOf(t, today) === "today",
  );
  return { today: due, overdue };
}

// Creates a new todo for the current user.
export async function createTodo(input: TodoInput) {
  const userId = await requireUserId();
  const data = todoSchema.parse(input);
  await prisma.todo.create({ data: { userId, ...toRecord(data) } });
  revalidateTodo();
}

// Updates a todo, scoped to the current user so others cannot be touched.
export async function updateTodo(id: string, input: TodoInput) {
  const userId = await requireUserId();
  const data = todoSchema.parse(input);
  await prisma.todo.updateMany({ where: { id, userId }, data: toRecord(data) });
  revalidateTodo();
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
  revalidateTodo();
}

// Deletes a todo, scoped to the current user.
export async function deleteTodo(id: string) {
  const userId = await requireUserId();
  await prisma.todo.deleteMany({ where: { id, userId } });
  revalidateTodo();
}
