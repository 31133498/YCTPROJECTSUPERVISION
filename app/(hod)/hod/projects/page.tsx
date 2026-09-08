"use client";

import { useState } from "react";
import { FolderKanban } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { getDepartmentProjectsPage } from "@/lib/firestore";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { QueryState } from "@/components/shared/query-state";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { MilestoneStatus } from "@/lib/types";

const FILTERS: { value: MilestoneStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "on_track", label: "On track" },
  { value: "behind", label: "Behind" },
  { value: "stalled", label: "Stalled" },
];

export default function HodProjectsPage() {
  const { claims } = useAuth();
  const department = claims.department ?? "";
  const [filter, setFilter] = useState<MilestoneStatus | "all">("all");

  const query = usePaginatedQuery(
    (params) => getDepartmentProjectsPage(department, filter, params),
    [department, filter]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Department projects</h1>
        <p className="text-sm text-muted-foreground">
          Read-only, department-wide (HOD scope).
        </p>
      </header>

      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as MilestoneStatus | "all")}
      >
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
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
            title="No matching projects"
            description="No department projects match this milestone filter."
          />
        }
      >
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Milestone</TableHead>
                <TableHead>Next deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.items.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    {project.title}
                  </TableCell>
                  <TableCell>{project.studentName}</TableCell>
                  <TableCell>{project.supervisorName}</TableCell>
                  <TableCell>
                    <StatusBadge status={project.milestoneStatus} />
                  </TableCell>
                  <TableCell>{formatDate(project.nextDeadline)}</TableCell>
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
