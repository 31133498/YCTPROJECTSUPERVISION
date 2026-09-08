"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderKanban } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { getSupervisorProjectsPage } from "@/lib/firestore";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { QueryState } from "@/components/shared/query-state";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { ProjectStatus } from "@/lib/types";

const STATUS_TABS: { value: ProjectStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "archived", label: "Archived" },
];

export default function SupervisorProjectsPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const [status, setStatus] = useState<ProjectStatus>("active");

  const query = usePaginatedQuery(
    (params) => getSupervisorProjectsPage(uid, status, params),
    [uid, status]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Projects where you are the assigned supervisor.
        </p>
      </header>

      <Tabs
        value={status}
        onValueChange={(v) => setStatus(v as ProjectStatus)}
      >
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <QueryState
        phase={query.phase}
        error={query.error}
        onRetry={query.retry}
        skeleton={<TableSkeleton rows={8} columns={5} />}
        empty={
          <EmptyState
            icon={FolderKanban}
            title={`No ${status} projects`}
            description="Projects assigned to you with this status will be listed here."
          />
        }
      >
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Milestone</TableHead>
                <TableHead>Next deadline</TableHead>
                <TableHead className="text-right">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.items.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/supervisor/projects/${project.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {project.title}
                    </Link>
                  </TableCell>
                  <TableCell>{project.studentName}</TableCell>
                  <TableCell>
                    <StatusBadge status={project.milestoneStatus} />
                  </TableCell>
                  <TableCell>{formatDate(project.nextDeadline)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {project.progressPct}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
