import type { User } from "next-auth";
import { BrandMark } from "@/components/brand-mark";
import { NavLinks } from "@/components/layout/nav-links";
import { AccountMenu } from "@/components/layout/account-menu";

// App sidebar: header (brand) -> grouped nav -> user footer.
// Nav links are driven by config/modules.config.ts.
export function Sidebar({ user }: { user: User }) {
  return (
    <aside className="bg-surface sticky top-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r">
      <div className="flex h-16 shrink-0 items-center gap-3 px-5">
        <BrandMark size={30} />
        <span className="text-lg font-semibold tracking-[-0.02em]">
          LifePerch
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
        <NavLinks />
      </nav>

      <div className="shrink-0 border-t p-3">
        <AccountMenu user={user} />
      </div>
    </aside>
  );
}
