import type { Timestamp } from "firebase/firestore";

/**
 * Domain model for the Digital Project Supervision & Progress Tracking System.
 *
 * Firestore layout (subcollections):
 *   users/{uid}
 *   dashboard_stats/{supervisorId}
 *   projects/{projectId}
 *   projects/{projectId}/tickets/{ticketId}
 *   projects/{projectId}/submissions/{submissionId}
 *   projects/{projectId}/submissions/{submissionId}/comments/{commentId}
 */

export type Role = "student" | "supervisor" | "hod";

/** Custom-claims shape mirrored onto the Firebase Auth token. */
export interface AuthClaims {
  role: Role;
  /** Department code — HOD read scope is department-wide. */
  department: string;
}

export type MilestoneStatus = "on_track" | "behind" | "stalled";
export type ProjectStatus = "active" | "submitted" | "approved" | "archived";
export type TicketStatus = "open" | "in_progress" | "blocked" | "done";
export type TicketPriority = "low" | "medium" | "high";
export type SubmissionKind =
  | "proposal"
  | "chapter"
  | "revision"
  | "final"
  | "other";
export type SubmissionStatus =
  | "pending_review"
  | "changes_requested"
  | "approved";

/** Base fields every stored document carries after the converter runs. */
export interface DocBase {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserDoc extends DocBase {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  department: string;
  photoURL?: string;
  /** Present on student docs only — enables fast supervisor roster queries. */
  supervisorId?: string;
  /** Present on student docs only — the student's single active project. */
  projectId?: string;
}

export interface ProjectDoc extends DocBase {
  title: string;
  abstract: string;
  department: string;
  status: ProjectStatus;
  milestoneStatus: MilestoneStatus;
  /** Denormalised for list rendering without extra reads. */
  studentId: string;
  studentName: string;
  supervisorId: string;
  supervisorName: string;
  /** ISO date (yyyy-mm-dd) of the next milestone deadline. */
  nextDeadline: string | null;
  progressPct: number;
  openTicketCount: number;
  lastActivityAt: Timestamp;
}

export interface TicketDoc extends DocBase {
  projectId: string;
  title: string;
  body: string;
  status: TicketStatus;
  priority: TicketPriority;
  authorId: string;
  authorName: string;
  assigneeId: string | null;
  dueDate: string | null;
}

export interface SubmissionDoc extends DocBase {
  projectId: string;
  title: string;
  kind: SubmissionKind;
  status: SubmissionStatus;
  version: number;
  /** Firebase Storage object path, not a public URL. */
  storagePath: string;
  fileName: string;
  fileSize: number;
  submittedById: string;
  submittedByName: string;
  commentCount: number;
}

export interface CommentDoc extends DocBase {
  projectId: string;
  submissionId: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  body: string;
}

/**
 * Top-level denormalised counters, one doc per supervisor, refreshed by a
 * Cloud Function write-trigger. Supervisor and HOD dashboards read this
 * instead of fanning out across every project.
 */
export interface DashboardStatsDoc extends DocBase {
  supervisorId: string;
  supervisorName: string;
  department: string;
  activeProjects: number;
  overdueCount: number;
  pendingSubmissions: number;
  openTickets: number;
  byMilestoneStatus: Record<MilestoneStatus, number>;
  lastActivityAt: Timestamp;
}

/** Shape used by the shared activity <Timeline />. */
export interface ActivityEvent {
  id: string;
  kind: "ticket" | "submission" | "comment" | "status_change";
  title: string;
  actorName: string;
  at: Timestamp;
  href?: string;
}
