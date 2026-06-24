import { getCollections } from "@/actions/notes";
import { NotebooksBoard } from "@/components/modules/notes/notebooks-board";

// Notes landing: notebooks. Notes live inside a notebook.
export default async function NotesPage() {
  const notebooks = await getCollections();
  return <NotebooksBoard notebooks={notebooks} />;
}
