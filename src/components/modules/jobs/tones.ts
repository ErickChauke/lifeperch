// Status tokens for the pipeline. Meaning rides these tokens, never the lime
// accent. Stages and outcomes each map to a token; tint() makes the soft fill.
export const STAGE_TONE: Record<string, string> = {
  applied: "var(--info)",
  interview: "var(--warning)",
  offer: "var(--success)",
  outcome: "var(--text-3)",
};

export const OUTCOME_TONE: Record<string, string> = {
  accepted: "var(--success)",
  rejected: "var(--danger)",
  withdrawn: "var(--text-3)",
};

// A soft ~15% tint over transparent for a status fill.
export function tint(tone: string): string {
  return `color-mix(in oklch, ${tone} 15%, transparent)`;
}
