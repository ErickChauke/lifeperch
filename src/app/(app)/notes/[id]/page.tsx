import { notFound } from "next/navigation";
import { getCollection } from "@/actions/notes";
import { NotebookView } from "@/components/modules/notes/notebook-view";

// One notebook and its notes, scoped.
export default async function NotebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const notebook = await getCollection(id);
  if (!notebook) notFound();
  return <NotebookView notebook={notebook} />;
}
