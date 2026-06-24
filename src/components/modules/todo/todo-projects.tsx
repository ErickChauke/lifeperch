"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/layout/page-shell";
import { ProjectModal } from "./project-modal";
import type { getCollections } from "@/actions/todo";

type Project = Awaited<ReturnType<typeof getCollections>>[number];

// To-Do landing: a board of projects. Each project keeps its own list and
// calendar of todos.
export function TodoProjects({ projects }: { projects: Project[] }) {
  const [creating, setCreating] = useState(false);

  if (projects.length === 0) {
    return (
      <PageShell>
        <PageBody>
          <div className="mx-auto max-w-[560px] py-12 text-center">
            <p className="text-fg-3 font-mono text-[10.5px] uppercase tracking-[0.10em]">
              Plan · To-Do
            </p>
            <p className="text-fg-2 mt-3 text-[15px]">
              No projects yet. Make one - Uni, Work, Personal - and each keeps its own
              list and calendar of tasks.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={() => setCreating(true)}>
                <Plus /> New project
              </Button>
            </div>
          </div>
          <ProjectModal open={creating} onOpenChange={setCreating} />
        </PageBody>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.01em]">To-Do</h2>
            <p className="text-fg-3 mt-1 font-mono text-xs">
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus /> New project
          </Button>
        </div>
      </PageHeader>

      <PageBody className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
        <ProjectModal open={creating} onOpenChange={setCreating} />
      </PageBody>
    </PageShell>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const count = project._count.todos;
  return (
    <Link
      href={`/todo/${project.id}`}
      className="group bg-surface hover:bg-surface-2 hover:border-border-2 focus-visible:border-accent-line flex flex-col gap-3 rounded-lg border p-4 transition-all hover:-translate-y-px"
    >
      <span className="bg-surface-2 text-fg-2 flex size-10 items-center justify-center rounded-sm">
        <ListChecks className="size-5" strokeWidth={1.75} />
      </span>
      <div className="space-y-1">
        <span className="text-fg block truncate font-semibold">{project.title}</span>
        {project.description ? (
          <p className="text-fg-2 line-clamp-2 text-sm">{project.description}</p>
        ) : null}
      </div>
      <span className="text-fg-3 mt-auto font-mono text-xs">
        {count === 0 ? "Empty project" : `${count} ${count === 1 ? "todo" : "todos"}`}
      </span>
    </Link>
  );
}
