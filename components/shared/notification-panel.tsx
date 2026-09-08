"use client";

import { Bell } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";
import { formatRelativeTime } from "@/lib/format";
import type { ActivityEvent } from "@/lib/types";

/**
 * Cross-role notification dropdown. Presentational: pass in the already-fetched
 * `items` and an optional unread count. Wire it to a listener in the shell.
 */
export function NotificationPanel({
  items,
  unreadCount = 0,
}: {
  items: ActivityEvent[];
  unreadCount?: number;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${
            unreadCount ? `, ${unreadCount} unread` : ""
          }`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-destructive" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="You're all caught up"
            description="New tickets, submissions and comments on your projects will show up here."
            className="min-h-0 border-0 p-6"
          />
        ) : (
          <ul className="max-h-80 overflow-y-auto py-1">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href ?? "#"}
                  className="block rounded-sm px-2 py-2 text-sm hover:bg-accent"
                >
                  <span className="font-medium">{item.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {item.actorName} &middot;{" "}
                    {formatRelativeTime(item.at)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
