import { getEntries } from "@/actions/journal";
import { JournalBoard } from "@/components/modules/journal/journal-board";

// Journal page. Fetches the user's entries and hands them to the board. An
// optional ?date= drill-in (from search results) opens straight to that day.
export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const entries = await getEntries();
  return <JournalBoard entries={entries} initialDate={date} />;
}
