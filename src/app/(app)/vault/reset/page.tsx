import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageShell, PageBody } from "@/components/layout/page-shell";
import { VaultResetConfirm } from "@/components/modules/vault/vault-reset-confirm";

// Landing for the emailed folder-password reset link. The actual reset runs on a
// button press inside VaultResetConfirm, not on load.
export default async function VaultResetPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string }>;
}) {
  const { id, token } = await searchParams;

  if (!id || !token) {
    return (
      <PageShell>
        <PageBody className="flex min-h-[60dvh] md:min-h-0">
          <div className="bg-surface m-auto w-full max-w-[400px] rounded-xl border p-8 text-center shadow-[var(--shadow-card)]">
            <h1 className="text-fg text-xl font-semibold">Invalid link</h1>
            <p className="text-fg-2 mt-2 text-[15px]">
              This reset link is missing information. Open the folder and request a new
              one.
            </p>
            <Link
              href="/vault"
              className={buttonVariants({ variant: "outline", className: "mt-5 w-full" })}
            >
              Back to the vault
            </Link>
          </div>
        </PageBody>
      </PageShell>
    );
  }

  return <VaultResetConfirm id={id} token={token} />;
}
