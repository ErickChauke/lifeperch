import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AppMain } from "@/components/layout/app-main";
import { SidebarProvider } from "@/components/layout/sidebar-context";

// Shared shell for all protected pages. Redirects to login when no session,
// backing up the proxy check. Pinned viewport: the shell never scrolls, only
// the main region does (and per-page bodies inside it on desktop).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <SidebarProvider>
      <div className="h-viewport flex overflow-hidden">
        <Sidebar user={session.user} />
        <div className="flex h-full min-w-0 flex-1 flex-col md:ml-64">
          <Topbar />
          <AppMain>{children}</AppMain>
        </div>
      </div>
    </SidebarProvider>
  );
}
