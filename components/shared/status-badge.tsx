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

const LABEL: Record<AnyStatus, string> = {
  on_track: "On track",
  behind: "Behind",
  stalled: "Stalled",
  active: "Active",
  submitted: "Submitted",
  approved: "Approved",
  archived: "Archived",
  pending_review: "Pending review",
  changes_requested: "Changes requested",
  open: "Open",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

type Tone = "green" | "amber" | "red" | "blue" | "gray";

const TONE_OF: Record<AnyStatus, Tone> = {
  on_track: "green",
  behind: "amber",
  stalled: "red",
  active: "blue",
  submitted: "blue",
  approved: "green",
  archived: "gray",
  pending_review: "amber",
  changes_requested: "red",
  open: "blue",
  in_progress: "amber",
  blocked: "red",
  done: "gray",
};

const TONE_CLASS: Record<Tone, string> = {
  green:
    "text-[hsl(var(--status-on-track))] bg-[hsl(var(--status-on-track)/0.10)] ring-[hsl(var(--status-on-track)/0.25)]",
  amber:
    "text-[hsl(var(--status-behind))] bg-[hsl(var(--status-behind)/0.10)] ring-[hsl(var(--status-behind)/0.25)]",
  red: "text-[hsl(var(--status-stalled))] bg-[hsl(var(--status-stalled)/0.10)] ring-[hsl(var(--status-stalled)/0.25)]",
  blue: "text-primary bg-primary/10 ring-primary/25",
  gray: "text-muted-foreground bg-muted ring-border",
};

const DOT: Record<Tone, string> = {
  green: "bg-[hsl(var(--status-on-track))]",
  amber: "bg-[hsl(var(--status-behind))]",
  red: "bg-[hsl(var(--status-stalled))]",
  blue: "bg-primary",
  gray: "bg-muted-foreground",
};

export function StatusBadge({
  status,
  dot = true,
  className,
}: {
  status: AnyStatus;
  dot?: boolean;
  className?: string;
}) {
  const tone = TONE_OF[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-medium ring-1 ring-inset",
        TONE_CLASS[tone],
        className
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", DOT[tone])} />
      )}
      {LABEL[status]}
    </span>
  );
}
