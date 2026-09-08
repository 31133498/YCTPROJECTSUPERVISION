import "server-only";

/**
 * `dashboard_stats/{supervisorId}` maintenance.
 *
 *  - Triggering routes apply INCREMENTAL deltas (`FieldValue.increment`) inside
 *    the same batch as the ticket / submission / comment write — so the
 *    supervisor & HOD dashboards never aggregate live.
 *  - The daily cron calls `recomputeSupervisorStats` to heal any drift.
 */
import {
  FieldValue,
  type Firestore,
  type WriteBatch,
} from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import type { MilestoneStatus } from "@/lib/types";

export function statsRef(db: Firestore, supervisorId: string) {
  return db.doc(`dashboard_stats/${supervisorId}`);
}

/** Queue an incremental stat change onto an existing batch. */
export function bumpStats(
  batch: WriteBatch,
  db: Firestore,
  supervisorId: string,
  delta: Partial<
    Record<
      | "activeProjects"
      | "overdueCount"
      | "pendingSubmissions"
      | "openTickets",
      number
    >
  >,
  touchActivity = true
): void {
  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  for (const [k, v] of Object.entries(delta)) {
    if (v) patch[k] = FieldValue.increment(v);
  }
  if (touchActivity) patch.lastActivityAt = FieldValue.serverTimestamp();
  batch.set(statsRef(db, supervisorId), patch, { merge: true });
}

/** Full recompute from source data. Used by the nightly cron. */
export async function recomputeSupervisorStats(
  supervisorId: string
): Promise<void> {
  const db = getAdminDb();
  const projectsSnap = await db
    .collection("projects")
    .where("supervisorId", "==", supervisorId)
    .get();

  const byMilestoneStatus: Record<MilestoneStatus, number> = {
    on_track: 0,
    behind: 0,
    stalled: 0,
  };
  let activeProjects = 0;
  let overdueCount = 0;
  let openTickets = 0;

  const responseHours: number[] = [];
  let pendingSubmissions = 0;

  for (const doc of projectsSnap.docs) {
    const p = doc.data();
    if (p.status === "active") activeProjects += 1;
    openTickets += p.openTicketCount ?? 0;
    const ms = (p.milestoneStatus ?? "on_track") as MilestoneStatus;
    byMilestoneStatus[ms] += 1;
    if (ms !== "on_track") overdueCount += 1;

    const subs = await db
      .collection(`projects/${doc.id}/submissions`)
      .get();
    for (const s of subs.docs) {
      const sd = s.data();
      if (sd.status === "pending_review") pendingSubmissions += 1;
      if (sd.firstResponseAt && sd.createdAt) {
        const h =
          (sd.firstResponseAt.toMillis() - sd.createdAt.toMillis()) / 3_600_000;
        if (h >= 0) responseHours.push(h);
      }
    }
  }

  const avgResponseHours =
    responseHours.length > 0
      ? Math.round(
          (responseHours.reduce((a, b) => a + b, 0) / responseHours.length) * 10
        ) / 10
      : null;

  const supDoc = await db.doc(`users/${supervisorId}`).get();

  await statsRef(db, supervisorId).set(
    {
      supervisorId,
      supervisorName: supDoc.data()?.displayName ?? "",
      department: supDoc.data()?.department ?? "",
      activeProjects,
      overdueCount,
      pendingSubmissions,
      openTickets,
      avgResponseHours,
      byMilestoneStatus,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
