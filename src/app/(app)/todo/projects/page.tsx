import { getCollections } from "@/actions/todo";
import { TodoProjects } from "@/components/modules/todo/todo-projects";

// The projects grid: one card per project, each linking to its own board.
export default async function TodoProjectsPage() {
  const projects = await getCollections();
  return <TodoProjects projects={projects} />;
}
