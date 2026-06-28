import { notFound } from "next/navigation";
import { getCollection } from "@/actions/todo";
import { TodoBoard } from "@/components/modules/todo/todo-board";

// One list: its todos and calendar, scoped.
export default async function TodoListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getCollection(id);
  if (!project) notFound();
  return <TodoBoard project={project} />;
}
