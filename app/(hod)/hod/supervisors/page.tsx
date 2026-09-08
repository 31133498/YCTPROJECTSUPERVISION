"use client";

import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { getDepartmentDashboardStats } from "@/lib/firestore";
import { useAsyncData } from "@/hooks/use-async-data";
import { QueryState } from "@/components/shared/query-state";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { CardGridSkeleton } from "@/components/shared/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStatsDoc } from "@/lib/types";

export default function HodSupervisors() {
  const { claims } = useAuth();
  const dept = claims.department ?? "";
  const rollups = useAsyncData<DashboardStatsDoc[]>(
    () => getDepartmentDashboardStats(dept),
    [dept]
  );

  return (
    <div>
      <PageHeader
        title="Supervisors"
        description="Load and responsiveness per supervisor. Click through for the drill-down."
      />
      <QueryState
        phase={rollups.phase}
        error={rollups.error}
        onRetry={rollups.retry}
        skeleton={<CardGridSkeleton count={6} />}
        empty={
          <EmptyState
            icon={Users}
            title="No supervisors yet"
            description="Supervisor accounts with active projects appear here."
          />
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(rollups.data ?? [])
            .slice()
            .sort((a, b) => b.overdueCount - a.overdueCount)
            .map((r) => (
              <Card key={r.id} interactive>
                <Link href={`/hod/supervisors/${r.supervisorId}`}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{r.supervisorName}</p>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <Stat label="Active" value={r.activeProjects} />
                      <Stat label="Overdue" value={r.overdueCount} tone="amber" />
                      <Stat
                        label="Response"
                        value={
                          r.avgResponseHours == null
                            ? "—"
                            : `${r.avgResponseHours}h`
                        }
                      />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
        </div>
      </QueryState>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "amber";
}) {
  return (
    <div>
      <p
        className={
          tone === "amber" && value !== 0
            ? "text-lg font-semibold tnum text-[hsl(var(--status-behind))]"
            : "text-lg font-semibold tnum"
        }
      >
        {value}
      </p>
      <p className="text-2xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
