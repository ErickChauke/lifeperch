"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell, PageBody } from "@/components/layout/page-shell";
import { unlockCollection } from "@/actions/vault";

// A locked card: a password prompt and nothing else. The card's documents stay
// hidden until a correct password unlocks it for the session.
export function CardGate({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!password) return;
    startTransition(async () => {
      const result = await unlockCollection(id, password);
      if (result.ok) {
        router.refresh();
      } else {
        setError(true);
        setPassword("");
      }
    });
  }

  return (
    <PageShell>
      <PageBody className="flex min-h-[60dvh] flex-col md:min-h-0">
        <Link
          href="/vault"
          className="text-fg-3 hover:text-fg-2 inline-flex items-center gap-1 font-mono text-xs"
        >
          <ChevronLeft className="size-4" /> Vault
        </Link>
        <div className="bg-surface m-auto w-full max-w-[380px] rounded-xl border p-8 text-center shadow-[var(--shadow-card)]">
          <div className="bg-surface-2 text-fg-2 mx-auto flex size-12 items-center justify-center rounded-lg">
            <Lock className="size-[22px]" strokeWidth={1.75} />
          </div>
          <h1 className="text-fg mt-5 text-xl font-semibold">{title}</h1>
          <p className="text-fg-2 mt-2 text-[15px]">
            Locked. Enter this card&apos;s password to open it.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="mt-5 space-y-3"
          >
            <Input
              type="password"
              value={password}
              autoFocus
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Password"
              className="h-10 text-center"
            />
            {error ? (
              <p className="text-xs text-[var(--danger)]">
                That password doesn&apos;t match. Try again.
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={!password || pending}
            >
              Unlock
            </Button>
          </form>
        </div>
      </PageBody>
    </PageShell>
  );
}
