// Shared type-only empty state for the Money screens, matching the Notes/Journal
// pattern: a mono eyebrow, a warm one-line invitation, and a single primary
// action.
export function MoneyEmpty({
  eyebrow,
  message,
  action,
}: {
  eyebrow: string;
  message: string;
  action: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[560px] py-12 text-center">
      <p className="text-fg-3 font-mono text-[10.5px] uppercase tracking-[0.10em]">
        {eyebrow}
      </p>
      <p className="text-fg-2 mt-3 text-[15px]">{message}</p>
      <div className="mt-6 flex justify-center">{action}</div>
    </div>
  );
}
