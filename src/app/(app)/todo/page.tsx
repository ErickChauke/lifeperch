import { getTodos, getCollections } from "@/actions/todo";
import { TodoHome } from "@/components/modules/todo/todo-home";

// To-Do home: a cross-project surface that runs the day. Per-project boards live
// at /todo/[id]; the projects grid is at /todo/projects.
export default async function TodoPage() {
  const [todos, collections] = await Promise.all([
    getTodos(),
    getCollections(),
  ]);
  return <TodoHome todos={todos} collections={collections} />;
}
