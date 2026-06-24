import { notFound } from "next/navigation";
import { getCollection } from "@/actions/literature";
import { LiteratureCollectionView } from "@/components/modules/literature/literature-collection";

// One literature topic and its papers, scoped.
export default async function LiteratureTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await getCollection(id);
  if (!collection) notFound();
  return <LiteratureCollectionView collection={collection} />;
}
