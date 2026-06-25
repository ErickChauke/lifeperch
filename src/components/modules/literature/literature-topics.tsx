"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderOpen, FolderPlus, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/layout/page-shell";
import { MoneyEmpty } from "@/components/modules/money/money-empty";
import { TopicModal } from "./topic-modal";
import { PaperModal } from "./paper-modal";
import type { getCollections } from "@/actions/literature";

type Topic = Awaited<ReturnType<typeof getCollections>>[number];

// Literature landing: a board of topic folders. Papers live inside a topic, but
// you can also add a paper straight from here and pick or create its topic.
export function LiteratureTopics({ topics }: { topics: Topic[] }) {
  const [creating, setCreating] = useState(false);
  const [addingPaper, setAddingPaper] = useState(false);
  const topicOptions = topics.map((t) => ({ id: t.id, title: t.title }));

  if (topics.length === 0) {
    return (
      <PageShell>
        <PageBody className="pt-6 md:pt-10">
          <MoneyEmpty
            eyebrow="Records · Literature"
            message="No topics yet. Add a paper - it makes its first topic - or set up a topic to group papers in."
            action={
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setCreating(true)}>
                  <FolderPlus /> New topic
                </Button>
                <Button onClick={() => setAddingPaper(true)}>
                  <FilePlus /> Add paper
                </Button>
              </div>
            }
          />
          <TopicModal open={creating} onOpenChange={setCreating} />
          <PaperModal
            open={addingPaper}
            onOpenChange={setAddingPaper}
            topics={topicOptions}
            paper={null}
          />
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
              <FolderPlus /> New topic
            </Button>
            <Button size="sm" onClick={() => setAddingPaper(true)}>
              <FilePlus /> Add paper
            </Button>
          </div>
        </div>
      </PageHeader>

      <PageBody className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
        <TopicModal open={creating} onOpenChange={setCreating} />
        <PaperModal
          open={addingPaper}
          onOpenChange={setAddingPaper}
          topics={topicOptions}
          paper={null}
        />
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
