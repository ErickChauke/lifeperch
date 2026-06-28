import { getCollections } from "@/actions/todo";
import { TodoLists } from "@/components/modules/todo/todo-lists";

// The lists grid: one card per list, each linking to its own board.
export default async function TodoListsPage() {
  const lists = await getCollections();
  return <TodoLists lists={lists} />;
}
