"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { unlockVault } from "@/actions/vault";

// The locked state: a calm PIN gate and nothing else. Nothing about the vault's
// contents is shown until a correct PIN unlocks it for the session.
export function VaultGate() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!pin) return;
    startTransition(async () => {
      const result = await unlockVault(pin);
      if (result.ok) {
        router.refresh();
      } else {
        setError(true);
        setPin("");
      }
    });
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="bg-surface w-full max-w-[380px] rounded-xl border p-8 text-center shadow-[var(--shadow-card)]">
        <div className="bg-surface-2 text-fg-2 mx-auto flex size-12 items-center justify-center rounded-lg">
          <Lock className="size-[22px]" strokeWidth={1.75} />
        </div>
        <h1 className="text-fg mt-5 text-xl font-semibold">Vault</h1>
        <p className="text-fg-2 mt-2 text-[15px]">
          Locked. Enter your PIN to open the drawer.
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
            inputMode="numeric"
            value={pin}
            autoFocus
            onChange={(e) => {
              setPin(e.target.value);
              setError(false);
            }}
            placeholder="••••"
            className="h-10 text-center font-mono tracking-[0.3em]"
          />
          {error ? (
            <p className="text-xs text-[var(--danger)]">
              {"That PIN doesn't match. Try again."}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={!pin || pending}>
            Unlock
          </Button>
        </form>
      </div>
    </div>
  );
}
