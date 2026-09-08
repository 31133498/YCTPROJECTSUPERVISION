"use client";

import { Users } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { getDepartmentUsersPage } from "@/lib/firestore";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { QueryState } from "@/components/shared/query-state";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HodSupervisorsPage() {
  const { claims } = useAuth();
  const department = claims.department ?? "";
  const query = usePaginatedQuery(
    (params) => getDepartmentUsersPage(department, params),
    [department]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Department members</h1>
        <p className="text-sm text-muted-foreground">
          Everyone in {department || "the department"} — supervisors, students
          and staff.
        </p>
      </header>

      <QueryState
        phase={query.phase}
        error={query.error}
        onRetry={query.retry}
        skeleton={<ListSkeleton rows={8} />}
        empty={
          <EmptyState
            icon={Users}
            title="No members"
            description="Provisioned department accounts will be listed here."
          />
        }
      >
        <ul className="divide-y rounded-lg border">
          {query.items.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {member.displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.email}
                </p>
              </div>
              <Badge variant="secondary" className="capitalize">
                {member.role}
              </Badge>
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
