import { signIn } from "@/lib/auth";
import { BrandMark } from "@/components/brand-mark";

// Multicolour Google "G" glyph.
function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen place-items-center p-6">
      {/* Atmospheric accent glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(420px circle at 50% 32%, var(--accent-soft), transparent 70%)",
        }}
      />

      <div
        className="bg-surface relative w-full max-w-[400px] rounded-[var(--r-xl)] border px-8 pt-10 pb-8 text-center"
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <div className="mb-6 flex justify-center">
          <BrandMark size={56} />
        </div>

        <h1 className="text-[28px] font-semibold tracking-[-0.03em]">
          LifePerch
        </h1>
        <p className="text-fg-2 mt-2 text-[15px]">
          Your life, in one quiet place.
          <br />
          <span className="text-accent-read">Sign in to do the work.</span>
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
          className="mt-8"
        >
          <button
            type="submit"
            className="bg-surface text-fg hover:border-border-2 hover:bg-surface-2 flex h-12 w-full items-center justify-center gap-3 rounded-[var(--r)] border text-[15px] font-medium transition-colors active:translate-y-px"
          >
            <GoogleGlyph />
            Continue with Google
          </button>
        </form>

        <p className="text-fg-3 mt-6 text-xs leading-relaxed">
          A private space for one person.
          <br />
          By continuing you agree to the{" "}
          <span className="text-fg-2 border-border-2 border-b">terms</span> &{" "}
          <span className="text-fg-2 border-border-2 border-b">privacy</span>.
        </p>
      </div>

      <p className="text-fg-4 absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-xs tracking-[0.04em]">
        LIFEPERCH · v0.1 · SPRINT 0
      </p>
    </main>
  );
}
