"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { getStudentProjectsPage } from "@/lib/firestore";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { QueryState } from "@/components/shared/query-state";
import { EmptyState } from "@/components/shared/empty-state";
import { CardGridSkeleton } from "@/components/shared/skeletons";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const query = usePaginatedQuery(
    (params) => getStudentProjectsPage(uid, params),
    [uid]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your project, milestones and supervisor feedback.
        </p>
      </header>

      <QueryState
        phase={query.phase}
        error={query.error}
        onRetry={query.retry}
        skeleton={<CardGridSkeleton count={1} />}
        empty={
          <EmptyState
            icon={FolderKanban}
            title="No project assigned yet"
            description="Once your supervisor creates your project it will appear here with its milestones."
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {query.items.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    {project.title}
                  </CardTitle>
                  <StatusBadge status={project.milestoneStatus} />
                </div>
                <CardDescription>
                  Supervisor: {project.supervisorName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="line-clamp-2 text-muted-foreground">
                  {project.abstract}
                </p>
                <p className="text-xs text-muted-foreground">
                  Next deadline: {formatDate(project.nextDeadline)} &middot;{" "}
                  {project.progressPct}% complete
                </p>
                <Link
                  href={`/student/project/${project.id}`}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open project &rarr;
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
