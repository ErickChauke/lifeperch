"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import { Monitor, Moon, Sun, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageShell, PageHeader, PageBody } from "@/components/layout/page-shell";
import { signOutAction } from "@/actions/auth";
import {
  setDailyDigest,
  setTodoCleanupDays,
  runTodoCleanup,
  wipeAllData,
} from "@/actions/settings";
import { CLEANUP_DAYS, cleanupLabel, parseCleanupDays } from "@/lib/todo";
import type { getSettings } from "@/actions/settings";
import { cn } from "@/lib/utils";

type Settings = Awaited<ReturnType<typeof getSettings>>;

// Nothing to subscribe to: the store only reports whether we are past hydration.
const subscribeNothing = () => () => {};

const THEMES = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

// Settings for the one account. Everything here is a per-user preference stored
// on the User row; anything build-time (which modules exist) stays in config/.
export function SettingsBoard({ settings }: { settings: Settings }) {
  const [digest, setDigest] = useState(settings.dailyDigest);
  const [cleanup, setCleanup] = useState(settings.todoCleanupDays);
  const [pending, startTransition] = useTransition();

  function onDigestChange(next: boolean) {
    setDigest(next);
    startTransition(async () => {
      try {
        await setDailyDigest(next);
      } catch {
        setDigest(!next);
        toast.error("Could not save that");
      }
    });
  }

  function onCleanupChange(value: string) {
    const next = parseCleanupDays(value);
    const previous = cleanup;
    setCleanup(next);
    startTransition(async () => {
      try {
        const removed = await setTodoCleanupDays(next);
        if (removed > 0) {
          toast.success(`Removed ${removed} finished ${plural(removed, "todo")}`);
        }
      } catch {
        setCleanup(previous);
        toast.error("Could not save that");
      }
    });
  }

  function onCleanNow() {
    startTransition(async () => {
      try {
        const removed = await runTodoCleanup();
        toast.success(
          removed > 0
            ? `Removed ${removed} finished ${plural(removed, "todo")}`
            : "Nothing old enough to clear",
        );
      } catch {
        toast.error("Could not run the cleanup");
      }
    });
  }

  return (
    <PageShell>
      <PageHeader>
        <h2 className="text-fg text-[22px] font-semibold tracking-[-0.01em]">
          Settings
        </h2>
        <p className="text-fg-2 mt-1 text-sm">
          Preferences for this account. Changes save as you make them.
        </p>
      </PageHeader>

      <PageBody className="pt-2 md:pt-2">
        <div className="flex max-w-[640px] flex-col gap-4 pb-4">
          <Account settings={settings} />

          <Section
            title="Appearance"
            description="Dark is the default. System follows your device."
          >
            <ThemePicker />
          </Section>

          <Section
            title="Daily digest"
            description="A summary of what is due, emailed at 07:00 each morning. On a clear day nothing is sent, so a quiet inbox does not mean it is broken."
          >
            <Toggle
              label="Email me the digest"
              checked={digest}
              disabled={pending}
              onChange={onDigestChange}
            />
          </Section>

          <Section
            title="Auto clean todos"
            description="Finished one-off todos are deleted once they are this old. Repeating todos are never removed, since deleting one would end the repeat."
          >
            <div className="flex flex-col gap-3">
              <label className="flex items-center justify-between gap-4">
                <span className="text-fg text-sm">Keep finished todos</span>
                <Select
                  value={cleanup === null ? "" : String(cleanup)}
                  onChange={(e) => onCleanupChange(e.target.value)}
                  disabled={pending}
                  className="w-[180px]"
                >
                  <option value="">Never clean</option>
                  {CLEANUP_DAYS.map((days) => (
                    <option key={days} value={days}>
                      {cleanupLabel(days)}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="flex items-center justify-between gap-4">
                <p className="text-fg-3 text-xs">
                  {cleanup === null
                    ? "Finished todos are kept forever."
                    : `Runs each morning. ${cleanupLabel(cleanup)}, a finished todo is gone for good.`}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onCleanNow}
                  disabled={pending || cleanup === null}
                  className="shrink-0"
                >
                  Clean up now
                </Button>
              </div>
            </div>
          </Section>

          <DangerZone />
        </div>
      </PageBody>
    </PageShell>
  );
}

// Pairs a count with its noun, keeping the noun singular for one.
function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface rounded-md border border-border p-5">
      <h3 className="text-fg text-[15px] font-semibold">{title}</h3>
      <p className="text-fg-3 mt-1 mb-4 text-xs leading-relaxed">{description}</p>
      {children}
    </section>
  );
}

function Account({ settings }: { settings: Settings }) {
  const initial = (settings.name ?? settings.email ?? "?").charAt(0).toUpperCase();
  return (
    <section className="bg-surface rounded-md border border-border p-5">
      <div className="flex items-center gap-4">
        {settings.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.image}
            alt=""
            className="size-12 shrink-0 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-active))",
              color: "var(--accent-fg)",
            }}
          >
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-fg truncate text-[15px] font-semibold">
            {settings.name}
          </p>
          <p className="text-fg-3 truncate font-mono text-xs">{settings.email}</p>
        </div>
        <form action={signOutAction} className="shrink-0">
          <Button type="submit" variant="secondary" size="sm">
            <LogOut />
            Sign out
          </Button>
        </form>
      </div>
      <p className="text-fg-4 mt-4 text-xs">
        Signed in with Google. Name and picture come from that account. Here since{" "}
        {format(settings.createdAt, "d MMMM yyyy")}.
      </p>
    </section>
  );
}

// Clearing everything is irreversible, so it is gated three ways: the section is
// collapsed until asked for, the exact word has to be typed, and the action
// checks that word again on the server.
function DangerZone() {
  const [arming, setArming] = useState(false);
  const [word, setWord] = useState("");
  const [pending, startTransition] = useTransition();
  const ready = word === "DELETE";

  function onWipe() {
    if (!ready) return;
    startTransition(async () => {
      try {
        const removed = await wipeAllData(word);
        toast.success(`Cleared ${removed} ${plural(removed, "record")}`);
        setArming(false);
        setWord("");
      } catch {
        toast.error("Could not clear the data");
      }
    });
  }

  return (
    <section className="rounded-md border border-destructive/40 bg-destructive/10 p-5">
      <h3 className="text-destructive text-[15px] font-semibold">Danger zone</h3>
      <p className="text-fg-2 mt-1 text-xs leading-relaxed">
        Deletes everything in every module: timetable, journal, notes, money,
        habits, health, literature, applications, milestones, vault documents and
        todos, along with the files uploaded with them. Your account and these
        settings stay, so the app opens empty. There is no backup and no undo.
      </p>

      {arming ? (
        <div className="mt-4 flex flex-col gap-3">
          <label className="text-fg-2 text-xs">
            Type{" "}
            <span className="text-destructive font-mono font-semibold">DELETE</span> to
            confirm.
          </label>
          <Input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="DELETE"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="max-w-[220px] font-mono"
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={onWipe}
              disabled={!ready || pending}
            >
              {pending ? "Clearing..." : "Clear everything"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setArming(false);
                setWord("");
              }}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="destructive"
          size="sm"
          className="mt-4"
          onClick={() => setArming(true)}
        >
          Clear all data
        </Button>
      )}
    </section>
  );
}

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  // The chosen theme is only known on the client, so the first client render has
  // to match the server's. Reading it through a store rather than an effect
  // keeps the mount out of a cascading render.
  const mounted = React.useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  return (
    <div className="flex gap-2">
      {THEMES.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-[var(--r-sm)] border px-3 py-2.5 text-sm transition-colors",
              active
                ? "border-accent-line bg-accent-soft text-accent-read"
                : "text-fg-2 hover:bg-surface-2 hover:text-fg",
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-fg text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors outline-none",
          "focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
          // bg-primary, not bg-accent: --color-accent is the shadcn hover grey
          // here, so an accent fill on this surface would read as off.
          checked
            ? "border-accent-line bg-primary"
            : "bg-surface-3 border-border-2 hover:bg-surface-2",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-4 -translate-y-1/2 rounded-full transition-[left]",
            checked ? "left-[22px]" : "left-[3px]",
          )}
          style={{ background: checked ? "var(--accent-fg)" : "var(--text-2)" }}
        />
      </button>
    </label>
  );
}
