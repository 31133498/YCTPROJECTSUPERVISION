"use client";

import { AlertTriangle, FileClock, FolderKanban, Ticket } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { getDashboardStats } from "@/lib/firestore";
import { useAsyncData } from "@/hooks/use-async-data";
import { QueryState } from "@/components/shared/query-state";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCardsSkeleton } from "@/components/shared/skeletons";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";
import type { DashboardStatsDoc } from "@/lib/types";

/**
 * Reads the denormalised `dashboard_stats/{supervisorId}` doc — one small read.
 * No live aggregation across projects on load.
 */
export default function SupervisorDashboardPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const stats = useAsyncData(() => getDashboardStats(uid), [uid]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Rollup across the projects you supervise.
        </p>
      </header>

      <QueryState
        phase={stats.phase}
        error={stats.error}
        onRetry={stats.retry}
        skeleton={<StatCardsSkeleton count={4} />}
        empty={
          <EmptyState
            icon={FolderKanban}
            title="No stats yet"
            description="Your dashboard rollup is generated once you have at least one active project."
          />
        }
      >
        {stats.data && <StatGrid stats={stats.data} />}
      </QueryState>
    </div>
  );
}

function StatGrid({ stats }: { stats: DashboardStatsDoc }) {
  const cards = [
    {
      label: "Active projects",
      value: stats.activeProjects,
      icon: FolderKanban,
    },
    { label: "Overdue", value: stats.overdueCount, icon: AlertTriangle },
    {
      label: "Pending submissions",
      value: stats.pendingSubmissions,
      icon: FileClock,
    },
    { label: "Open tickets", value: stats.openTickets, icon: Ticket },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Last activity {formatRelativeTime(stats.lastActivityAt)}
      </p>
    </>
  );
}
