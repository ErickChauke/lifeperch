"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Pull distance (px) that arms a refresh, and the furthest the indicator travels.
const THRESHOLD = 70;
const MAX_PULL = 110;

// Returns true when a scrollable ancestor between the touch target and the main
// region is mid-scroll, so a downward drag should scroll it instead of pulling.
function ancestorScrolled(el: Element | null, root: HTMLElement) {
  for (let n = el; n && n !== root; n = n.parentElement) {
    if (n.scrollTop > 0) return true;
  }
  return false;
}

// The app shell's scroll region with pull-to-refresh. Dragging down from the
// top pulls out an indicator; releasing past the threshold calls
// router.refresh() to re-fetch server data in place, no full reload. The
// region keeps overscroll-none so the browser's own reload gesture stays off.
export function AppMain({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [pull, setPull] = useState(0);
  const mainRef = useRef<HTMLElement>(null);
  const startY = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    const main = mainRef.current;
    const armable =
      main !== null &&
      main.scrollTop <= 0 &&
      e.touches.length === 1 &&
      !refreshing &&
      !ancestorScrolled(e.target as Element, main);
    startY.current = armable ? e.touches[0].clientY : null;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0 || (mainRef.current?.scrollTop ?? 0) > 0) {
      startY.current = null;
      setPull(0);
      return;
    }
    setPull(Math.min(dy * 0.4, MAX_PULL));
  }

  function onTouchEnd() {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD) {
      startTransition(() => router.refresh());
    }
    setPull(0);
  }

  // While refreshing the indicator holds just below the top edge; while pulling
  // it tracks the drag from a hidden resting spot above the viewport.
  const offset = refreshing ? 16 : pull - 44;
  const visible = refreshing || pull > 0;

  return (
    <main
      ref={mainRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      className="scrollbar-hide relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-none pb-[env(safe-area-inset-bottom)]"
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center",
          pull === 0 && "transition-transform duration-200",
          !visible && "opacity-0",
        )}
        style={{ transform: `translateY(${offset}px)` }}
      >
        <span className="bg-surface flex size-9 items-center justify-center rounded-full border shadow-[var(--shadow-pop)]">
          <Loader2
            className={cn("text-fg-2 size-4", refreshing && "animate-spin")}
            style={refreshing ? undefined : { transform: `rotate(${pull * 2.5}deg)` }}
          />
        </span>
      </div>
      {children}
    </main>
  );
}
