import { cn } from "@/lib/utils";
import type {
  MilestoneStatus,
  ProjectStatus,
  SubmissionStatus,
  TicketStatus,
} from "@/lib/types";

type AnyStatus =
  | MilestoneStatus
  | ProjectStatus
  | SubmissionStatus
  | TicketStatus;

const LABELS: Record<AnyStatus, string> = {
  // milestone
  on_track: "On track",
  behind: "Behind",
  stalled: "Stalled",
  // project
  active: "Active",
  submitted: "Submitted",
  approved: "Approved",
  archived: "Archived",
  // submission
  pending_review: "Pending review",
  changes_requested: "Changes requested",
  // ticket
  open: "Open",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

const TONE: Record<AnyStatus, string> = {
  on_track:
    "bg-[hsl(var(--status-on-track)/0.12)] text-[hsl(var(--status-on-track))] ring-[hsl(var(--status-on-track)/0.3)]",
  behind:
    "bg-[hsl(var(--status-behind)/0.12)] text-[hsl(var(--status-behind))] ring-[hsl(var(--status-behind)/0.3)]",
  stalled:
    "bg-[hsl(var(--status-stalled)/0.12)] text-[hsl(var(--status-stalled))] ring-[hsl(var(--status-stalled)/0.3)]",
  active:
    "bg-[hsl(var(--status-on-track)/0.12)] text-[hsl(var(--status-on-track))] ring-[hsl(var(--status-on-track)/0.3)]",
  submitted: "bg-blue-500/12 text-blue-600 ring-blue-500/30",
  approved:
    "bg-[hsl(var(--status-on-track)/0.12)] text-[hsl(var(--status-on-track))] ring-[hsl(var(--status-on-track)/0.3)]",
  archived: "bg-muted text-muted-foreground ring-border",
  pending_review:
    "bg-[hsl(var(--status-behind)/0.12)] text-[hsl(var(--status-behind))] ring-[hsl(var(--status-behind)/0.3)]",
  changes_requested:
    "bg-[hsl(var(--status-stalled)/0.12)] text-[hsl(var(--status-stalled))] ring-[hsl(var(--status-stalled)/0.3)]",
  open: "bg-blue-500/12 text-blue-600 ring-blue-500/30",
  in_progress:
    "bg-[hsl(var(--status-behind)/0.12)] text-[hsl(var(--status-behind))] ring-[hsl(var(--status-behind)/0.3)]",
  blocked:
    "bg-[hsl(var(--status-stalled)/0.12)] text-[hsl(var(--status-stalled))] ring-[hsl(var(--status-stalled)/0.3)]",
  done: "bg-muted text-muted-foreground ring-border",
};

export function StatusBadge({
  status,
  className,
}: {
  status: AnyStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE[status],
        className
      )}
    >
      {LABELS[status]}
    </span>
  );
}
