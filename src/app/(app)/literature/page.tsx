import { getLit } from "@/actions/literature";
import { LiteratureBoard } from "@/components/modules/literature/literature-board";

// Literature tracker.
export default async function LiteraturePage() {
  const papers = await getLit();
  return <LiteratureBoard papers={papers} />;
}
