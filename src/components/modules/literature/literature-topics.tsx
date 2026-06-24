"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/layout/page-shell";
import { MoneyEmpty } from "@/components/modules/money/money-empty";
import { TopicModal } from "./topic-modal";
import type { getCollections } from "@/actions/literature";

type Topic = Awaited<ReturnType<typeof getCollections>>[number];

// Literature landing: a board of topic folders. Papers live inside a topic.
export function LiteratureTopics({ topics }: { topics: Topic[] }) {
  const [creating, setCreating] = useState(false);

  if (topics.length === 0) {
    return (
      <PageShell>
        <PageBody className="pt-6 md:pt-10">
          <MoneyEmpty
            eyebrow="Records · Literature"
            message="No topics yet. Make one for a subject you're reading into - a thesis review, a reading list - and group its papers inside."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus /> New topic
              </Button>
            }
          />
          <TopicModal open={creating} onOpenChange={setCreating} />
        </PageBody>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-fg text-2xl font-semibold">Literature</h1>
            <p className="text-fg-3 mt-1 font-mono text-xs">
              {topics.length} {topics.length === 1 ? "topic" : "topics"}
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus /> New topic
          </Button>
        </div>
      </PageHeader>

      <PageBody className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
        <TopicModal open={creating} onOpenChange={setCreating} />
      </PageBody>
    </PageShell>
  );
}

function TopicCard({ topic }: { topic: Topic }) {
  const count = topic._count.papers;
  return (
    <Link
      href={`/literature/${topic.id}`}
      className="group bg-surface hover:bg-surface-2 hover:border-border-2 focus-visible:border-accent-line flex flex-col gap-3 rounded-lg border p-4 transition-all hover:-translate-y-px"
    >
      <span className="bg-surface-2 text-fg-2 flex size-10 items-center justify-center rounded-sm">
        <FolderOpen className="size-5" strokeWidth={1.75} />
      </span>
      <div className="space-y-1">
        <span className="text-fg block truncate font-semibold">{topic.title}</span>
        {topic.description ? (
          <p className="text-fg-2 line-clamp-2 text-sm">{topic.description}</p>
        ) : null}
      </div>
      <span className="text-fg-3 mt-auto font-mono text-xs">
        {count === 0 ? "Empty topic" : `${count} ${count === 1 ? "paper" : "papers"}`}
      </span>
    </Link>
  );
}
