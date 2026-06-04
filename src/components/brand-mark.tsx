import { cn } from "@/lib/utils";

// The locked "Stride" brand mark: three ascending bars (momentum, doing the
// work) in --accent-fg on an --accent tile. Stands alone as favicon / collapsed
// logo. size sets the tile in px; radius scales with it to match the global corners.
export function BrandMark({
  size = 30,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center", className)}
      style={{
        width: size,
        height: size,
        background: "var(--accent)",
        borderRadius: Math.round(size * 0.32),
      }}
      aria-hidden
    >
      <svg
        width={Math.round(size * 0.58)}
        height={Math.round(size * 0.58)}
        viewBox="0 0 24 24"
        fill="none"
      >
        <rect x="3.5" y="13" width="4" height="8" rx="2" fill="var(--accent-fg)" />
        <rect x="10" y="8" width="4" height="13" rx="2" fill="var(--accent-fg)" />
        <rect x="16.5" y="3" width="4" height="18" rx="2" fill="var(--accent-fg)" />
      </svg>
    </div>
  );
}
