import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Sebenza</h1>
        <p className="text-muted-foreground mt-2 text-sm">Do the work.</p>
      </div>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
      >
        <Button type="submit" size="lg">
          Sign in with Google
        </Button>
      </form>
    </main>
  );
}
