import { getJobs } from "@/actions/jobs";
import { JobsBoard } from "@/components/modules/jobs/jobs-board";

// Applications pipeline: a Kanban board with a stage detail drawer.
export default async function JobsPage() {
  const applications = await getJobs();
  return <JobsBoard applications={applications} />;
}
