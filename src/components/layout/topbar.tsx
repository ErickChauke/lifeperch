import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

// Top bar with the current page title and a sign-out button.
export function Topbar({ title = "Dashboard" }: { title?: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
      <h1 className="text-sm font-medium">{title}</h1>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </header>
  );
}
