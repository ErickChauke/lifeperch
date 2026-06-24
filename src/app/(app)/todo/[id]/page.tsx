import { notFound } from "next/navigation";
import { getCollection } from "@/actions/todo";
import { TodoBoard } from "@/components/modules/todo/todo-board";

// One project: its list and calendar of todos, scoped.
export default async function TodoProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getCollection(id);
  if (!project) notFound();
  return <TodoBoard project={project} />;
}
