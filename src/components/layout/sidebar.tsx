import type { User } from "next-auth";
import { NavLinks } from "@/components/layout/nav-links";

// App sidebar. Nav links are driven by config/modules.config.ts.
export function Sidebar({ user }: { user: User }) {
  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border flex w-60 shrink-0 flex-col border-r p-4">
      <div className="mb-8 px-2">
        <span className="text-xl font-semibold tracking-tight">LifePerch</span>
      </div>

      <nav className="flex-1">
        <NavLinks />
      </nav>

      <div className="border-sidebar-border flex items-center gap-3 border-t pt-4">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="h-8 w-8 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="bg-muted h-8 w-8 rounded-full" />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
        </div>
      </div>
    </aside>
  );
}
