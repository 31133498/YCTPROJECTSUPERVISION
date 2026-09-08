import "server-only";

import {
  FieldValue,
  Timestamp,
  type DocumentReference,
  type WriteBatch,
} from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { computeMilestoneStatus } from "@/lib/milestone";
import type { ProjectDoc } from "@/lib/types";

export interface AdminProject extends Omit<ProjectDoc, "id"> {
  id: string;
}

export async function loadProjectAdmin(
  projectId: string
): Promise<AdminProject | null> {
  const snap = await getAdminDb().doc(`projects/${projectId}`).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<ProjectDoc, "id">) };
}

function tsToDate(v: unknown): Date | null {
  if (v instanceof Timestamp) return v.toDate();
  return null;
}

/**
 * Run the pure milestone function against a project's already-denormalised
 * fields and queue the result onto `batch`. Returns the verdict so callers can
 * also fold `overdueCount` deltas into `dashboard_stats`.
 */
export function applyMilestone(
  batch: WriteBatch,
  ref: DocumentReference,
  project: Pick<
    ProjectDoc,
    | "defenseDate"
    | "lastSubmissionAt"
    | "lastActivityAt"
    | "ticketsLast30Days"
    | "finalApproved"
    | "milestoneStatus"
  >,
  now = new Date()
) {
  const verdict = computeMilestoneStatus({
    defenseDate: project.defenseDate ?? null,
    lastSubmissionDate: tsToDate(project.lastSubmissionAt),
    lastActivityDate: tsToDate(project.lastActivityAt) ?? now,
    ticketsLast30Days: project.ticketsLast30Days ?? 0,
    finalApproved: Boolean(project.finalApproved),
    now,
  });
  batch.set(
    ref,
    {
      milestoneStatus: verdict.status,
      milestoneReason: verdict.reason,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return verdict;
}
