import { ListChecks } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export default function HodReportsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Exportable supervision summaries for the department.
        </p>
      </header>
      <EmptyState
        icon={ListChecks}
        title="Reports screen pending design"
        description="This route is wired and role-gated. The Stitch layout drops in here and consumes the same dashboard_stats reads as the department dashboard."
      />
    </div>
  );
}
