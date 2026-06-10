import { getMilestones } from "@/actions/timeline";
import { dateToDay } from "@/lib/money";
import { TimelineBoard } from "@/components/modules/timeline/timeline-board";

// Vertical timeline of life milestones, ordered by target date.
export default async function TimelinePage() {
  const milestones = await getMilestones();
  return <TimelineBoard milestones={milestones} today={dateToDay(new Date())} />;
}
