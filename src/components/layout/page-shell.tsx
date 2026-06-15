import { cn } from "@/lib/utils";

// Pinned-viewport page primitives (see design/sprint-6-layout.md).
// Desktop: PageShell fills the main region, PageHeader pins, PageBody scrolls.
// Mobile: the shell takes natural height, main scrolls as one surface and
// PageHeader goes sticky with a translucent blur.

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col md:h-full md:min-h-0 md:overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "bg-background/85 sticky top-0 z-20 shrink-0 px-5 pt-5 pb-4 backdrop-blur-[10px]",
        "md:static md:bg-transparent md:px-8 md:pt-10 md:pb-6 md:backdrop-blur-none",
        className,
      )}
    >
      {children}
    </header>
  );
}

export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "scrollbar-hide min-h-0 flex-1 px-5 pb-8 md:overflow-y-auto md:px-8 md:pb-10",
        className,
      )}
    >
      {children}
    </div>
  );
}
