"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ShieldCheck, KeyRound } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageShell, PageBody } from "@/components/layout/page-shell";
import { confirmCollectionPasswordReset } from "@/actions/vault";

type Phase = "idle" | "done" | "failed";

// Confirms an emailed folder password reset. The reset is a write, so it runs on
// an explicit button press rather than on page load.
export function VaultResetConfirm({ id, token }: { id: string; token: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [pending, startTransition] = useTransition();

  function reset() {
    startTransition(async () => {
      const result = await confirmCollectionPasswordReset(id, token);
      setPhase(result.ok ? "done" : "failed");
    });
  }

  return (
    <PageShell>
      <PageBody className="flex min-h-[60dvh] md:min-h-0">
        <div className="bg-surface m-auto w-full max-w-[400px] rounded-xl border p-8 text-center shadow-[var(--shadow-card)]">
          <div className="bg-surface-2 text-fg-2 mx-auto flex size-12 items-center justify-center rounded-lg">
            {phase === "done" ? (
              <ShieldCheck className="size-[22px]" strokeWidth={1.75} />
            ) : (
              <KeyRound className="size-[22px]" strokeWidth={1.75} />
            )}
          </div>

          {phase === "done" ? (
            <>
              <h1 className="text-fg mt-5 text-xl font-semibold">Password cleared</h1>
              <p className="text-fg-2 mt-2 text-[15px]">
                This folder is open again. Set a new password from its settings whenever
                you like.
              </p>
              <Link
                href={`/vault/${id}`}
                className={buttonVariants({ className: "mt-5 w-full" })}
              >
                Open the folder
              </Link>
            </>
          ) : phase === "failed" ? (
            <>
              <h1 className="text-fg mt-5 text-xl font-semibold">Link expired</h1>
              <p className="text-fg-2 mt-2 text-[15px]">
                This reset link is invalid or has expired. Open the folder and request a
                new link.
              </p>
              <Link
                href="/vault"
                className={buttonVariants({ variant: "outline", className: "mt-5 w-full" })}
              >
                Back to the vault
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-fg mt-5 text-xl font-semibold">Reset folder password</h1>
              <p className="text-fg-2 mt-2 text-[15px]">
                This clears the password on the folder so you can open it and set a new
                one.
              </p>
              <Button className="mt-5 w-full" onClick={reset} disabled={pending}>
                Clear password
              </Button>
            </>
          )}
        </div>
      </PageBody>
    </PageShell>
  );
}
