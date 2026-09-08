import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { NAV_BY_ROLE } from "@/lib/nav";
import type { SessionUser } from "@/lib/auth/session";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

/**
 * Authenticated app frame: fixed sidebar (role-aware nav) + sticky topbar.
 * Server component — the interactive bits (`UserMenu`) are client islands.
 * Content is passed as `children`; dimensions are reserved so page skeletons
 * don't shift the chrome.
 */
export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const nav = NAV_BY_ROLE[user.role];

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r bg-muted/20 md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <GraduationCap className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold leading-tight">
            Project Supervision
          </span>
        </div>
        <SidebarNav items={nav} />
        <p className="mt-auto p-4 text-[11px] text-muted-foreground">
          YABATECH ND &middot; {user.department}
        </p>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
          <Link
            href={nav[0]?.href ?? "/"}
            className="text-sm font-medium md:hidden"
          >
            Project Supervision
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <UserMenu
              name={user.name}
              email={user.email}
              role={user.role}
            />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
