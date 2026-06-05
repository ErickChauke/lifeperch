"use client";

import { useEffect, useState } from "react";
import type { User } from "next-auth";
import { useTheme } from "next-themes";
import { Menu } from "@base-ui/react/menu";
import { ChevronsUpDown, Moon, Sun, LogOut } from "lucide-react";
import { signOutAction } from "@/actions/auth";

// Sidebar footer account row: avatar + name + email, opening a menu with a
// theme toggle and sign-out. Theme state comes from next-themes.
export function AccountMenu({ user }: { user: User }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // resolvedTheme is only known on the client; avoid a hydration mismatch.
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <Menu.Root>
      <Menu.Trigger className="hover:bg-surface-2 flex w-full items-center gap-3 rounded-[var(--r)] p-2 text-left transition-colors outline-none">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="size-[34px] shrink-0 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className="flex size-[34px] shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-active))",
              color: "var(--accent-fg)",
            }}
          >
            {initial}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="text-fg block truncate text-[13px] font-semibold">
            {user.name}
          </span>
          <span className="text-fg-3 block truncate text-xs">{user.email}</span>
        </span>
        <ChevronsUpDown className="text-fg-3 size-4 shrink-0" strokeWidth={1.75} />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="top" align="start" sideOffset={8} className="z-50">
          <Menu.Popup
            className="bg-surface min-w-[208px] rounded-[var(--r)] border p-1.5 text-sm outline-none"
            style={{ boxShadow: "var(--shadow-pop)" }}
          >
            <Menu.Item
              closeOnClick={false}
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="text-fg-2 hover:bg-surface-2 hover:text-fg flex cursor-default items-center gap-2.5 rounded-[var(--r-sm)] px-2.5 py-2 outline-none select-none"
            >
              {mounted && isDark ? (
                <Sun className="size-4" strokeWidth={1.75} />
              ) : (
                <Moon className="size-4" strokeWidth={1.75} />
              )}
              {mounted && isDark ? "Light mode" : "Dark mode"}
            </Menu.Item>

            <form action={signOutAction}>
              <Menu.Item
                render={<button type="submit" />}
                className="text-fg-2 hover:bg-surface-2 hover:text-fg flex w-full cursor-default items-center gap-2.5 rounded-[var(--r-sm)] px-2.5 py-2 text-left outline-none"
              >
                <LogOut className="size-4" strokeWidth={1.75} />
                Sign out
              </Menu.Item>
            </form>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
