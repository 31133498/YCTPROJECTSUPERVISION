"use client";

import { BarChart3 } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { getDepartmentDashboardStats } from "@/lib/firestore";
import { useAsyncData } from "@/hooks/use-async-data";
import { QueryState } from "@/components/shared/query-state";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRelativeTime } from "@/lib/format";

/**
 * HOD department view. Reads one pre-aggregated `dashboard_stats` doc per
 * supervisor — never fans out into every project.
 */
export default function HodDashboardPage() {
  const { claims } = useAuth();
  const department = claims.department ?? "";
  const rollups = useAsyncData(
    () => getDepartmentDashboardStats(department),
    [department]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Department dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Supervision load across {department || "your department"}.
        </p>
      </header>

      <QueryState
        phase={rollups.phase === "ready" && rollups.data?.length === 0
          ? "empty"
          : rollups.phase}
        error={rollups.error}
        onRetry={rollups.retry}
        skeleton={<TableSkeleton rows={6} columns={6} />}
        empty={
          <EmptyState
            icon={BarChart3}
            title="No supervision data"
            description="Supervisor rollups appear here once projects are active in the department."
          />
        }
      >
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supervisor</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Overdue</TableHead>
                <TableHead className="text-right">Pending reviews</TableHead>
                <TableHead className="text-right">Open tickets</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rollups.data ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.supervisorName}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.activeProjects}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.overdueCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.pendingSubmissions}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.openTickets}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeTime(row.lastActivityAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </QueryState>
    </div>
  );
}
