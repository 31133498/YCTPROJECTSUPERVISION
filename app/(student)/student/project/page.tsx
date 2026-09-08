"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { getStudentProjectsPage } from "@/lib/firestore";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { QueryState } from "@/components/shared/query-state";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/skeletons";
import { StatusBadge } from "@/components/shared/status-badge";

export default function StudentProjectIndexPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const query = usePaginatedQuery(
    (params) => getStudentProjectsPage(uid, params),
    [uid]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">My project</h1>
      </header>
      <QueryState
        phase={query.phase}
        error={query.error}
        onRetry={query.retry}
        skeleton={<ListSkeleton rows={2} />}
        empty={
          <EmptyState
            icon={FolderKanban}
            title="Nothing here yet"
            description="Your supervisor hasn't created your project record."
          />
        }
      >
        <ul className="divide-y rounded-lg border">
          {query.items.map((project) => (
            <li key={project.id}>
              <Link
                href={`/student/project/${project.id}`}
                className="flex items-center justify-between gap-3 p-4 hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {project.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {project.supervisorName}
                  </p>
                </div>
                <StatusBadge status={project.milestoneStatus} />
              </Link>
            </li>
          ))}
        </ul>
      </QueryState>
    </div>
  );
}
