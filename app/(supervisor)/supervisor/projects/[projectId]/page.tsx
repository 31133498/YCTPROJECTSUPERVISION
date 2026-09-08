"use client";

import { FileText, Ticket as TicketIcon } from "lucide-react";

import {
  getProject,
  getSubmissionsPage,
  subscribeProjectTickets,
} from "@/lib/firestore";
import type { TicketDoc } from "@/lib/types";
import { useAsyncData } from "@/hooks/use-async-data";
import { useLiveCollection } from "@/hooks/use-live-collection";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { QueryState } from "@/components/shared/query-state";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  ListSkeleton,
  TimelineSkeleton,
} from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { formatDate, formatRelativeTime } from "@/lib/format";

export default function SupervisorProjectDetailPage({
  params,
}: {
  params: { projectId: string };
}) {
  const { projectId } = params;
  const project = useAsyncData(() => getProject(projectId), [projectId]);

  return (
    <div className="space-y-6">
      <QueryState
        phase={project.phase}
        error={project.error}
        onRetry={project.retry}
        skeleton={
          <div className="space-y-2">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        }
        empty={
          <EmptyState
            title="Project not found"
            description="It may be archived, or assigned to another supervisor."
          />
        }
      >
        {project.data && (
          <header className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{project.data.title}</h1>
              <StatusBadge status={project.data.milestoneStatus} />
            </div>
            <p className="text-sm text-muted-foreground">
              {project.data.studentName} &middot; next deadline{" "}
              {formatDate(project.data.nextDeadline)}
            </p>
          </header>
        )}
      </QueryState>

      <Tabs defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>
        <TabsContent value="tickets">
          <TicketsTab projectId={projectId} />
        </TabsContent>
        <TabsContent value="submissions">
          <SubmissionsTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TicketsTab({ projectId }: { projectId: string }) {
  const { phase, items, error } = useLiveCollection<TicketDoc>(
    (handlers) => subscribeProjectTickets(projectId, handlers),
    [projectId]
  );

  if (phase === "loading") return <TimelineSkeleton />;
  if (phase === "error") return <ErrorState description={error?.message} />;
  if (phase === "empty") {
    return (
      <EmptyState
        icon={TicketIcon}
        title="No tickets"
        description="Open a ticket to request changes or ask the student a question. The create form drops in from the Stitch design."
      />
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {items.map((ticket) => (
        <li key={ticket.id} className="flex items-start gap-3 p-4">
          <StatusBadge status={ticket.status} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{ticket.title}</p>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {ticket.body}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {ticket.authorName} &middot;{" "}
              {formatRelativeTime(ticket.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SubmissionsTab({ projectId }: { projectId: string }) {
  const query = usePaginatedQuery(
    (params) => getSubmissionsPage(projectId, params),
    [projectId]
  );

  return (
    <QueryState
      phase={query.phase}
      error={query.error}
      onRetry={query.retry}
      skeleton={<ListSkeleton rows={4} />}
      empty={
        <EmptyState
          icon={FileText}
          title="No submissions"
          description="The student hasn't uploaded anything for review yet."
        />
      }
    >
      <ul className="divide-y rounded-lg border">
        {query.items.map((submission) => (
          <li
            key={submission.id}
            className="flex items-center justify-between gap-3 p-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {submission.title} v{submission.version}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {submission.fileName} &middot;{" "}
                {formatDate(submission.createdAt)}
              </p>
            </div>
            <StatusBadge status={submission.status} />
          </li>
        ))}
      </ul>
    </QueryState>
  );
}
