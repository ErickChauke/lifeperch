import { getCollections } from "@/actions/todo";
import { TodoProjects } from "@/components/modules/todo/todo-projects";

// To-Do landing: projects. Each project keeps its own list and calendar.
export default async function TodoPage() {
  const projects = await getCollections();
  return <TodoProjects projects={projects} />;
}
