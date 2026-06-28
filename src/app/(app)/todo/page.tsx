import { getTodos, getCollections } from "@/actions/todo";
import { TodoHome } from "@/components/modules/todo/todo-home";

// To-Do home: a cross-list surface that runs the day. Per-list boards live
// at /todo/[id]; the lists grid is at /todo/lists.
export default async function TodoPage() {
  const [todos, collections] = await Promise.all([
    getTodos(),
    getCollections(),
  ]);
  return <TodoHome todos={todos} collections={collections} />;
}
