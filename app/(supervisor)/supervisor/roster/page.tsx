"use client";

import { Users } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { getRosterPage } from "@/lib/firestore";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { QueryState } from "@/components/shared/query-state";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";

export default function SupervisorRosterPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const query = usePaginatedQuery(
    (params) => getRosterPage(uid, params),
    [uid]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Roster</h1>
        <p className="text-sm text-muted-foreground">
          Students assigned to you (indexed by <code>supervisorId</code>).
        </p>
      </header>

      <QueryState
        phase={query.phase}
        error={query.error}
        onRetry={query.retry}
        skeleton={<ListSkeleton rows={6} />}
        empty={
          <EmptyState
            icon={Users}
            title="No students assigned"
            description="When the HOD assigns students to you they'll appear here."
          />
        }
      >
        <ul className="divide-y rounded-lg border">
          {query.items.map((student) => (
            <li
              key={student.id}
              className="flex items-center gap-3 p-4"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs">
                  {student.displayName
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {student.displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {student.email}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {query.hasMore && (
          <div className="mt-3 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={query.loadMore}
              disabled={query.loadingMore}
            >
              {query.loadingMore ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </QueryState>
    </div>
  );
}
