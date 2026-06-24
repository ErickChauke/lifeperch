import { getCollections } from "@/actions/literature";
import { LiteratureTopics } from "@/components/modules/literature/literature-topics";

// Literature landing: topic folders. Papers live inside a topic.
export default async function LiteraturePage() {
  const topics = await getCollections();
  return <LiteratureTopics topics={topics} />;
}
