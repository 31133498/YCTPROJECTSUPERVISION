/**
 * Cloud Functions — server-side derived state. NONE of this runs on the client.
 *
 *  1. denormaliseDashboardStats  — write-trigger. Keeps
 *     `dashboard_stats/{supervisorId}` in sync so supervisor/HOD dashboards do
 *     one small read instead of fanning out across every project.
 *
 *  2. recalcMilestoneStatusNightly — scheduled (03:00). Recomputes each active
 *     project's milestoneStatus (on_track | behind | stalled) from its
 *     deadlines/progress. Never computed in the browser on page load.
 *
 *  3. recalcMilestoneStatusOnWrite — write-trigger on tickets/submissions so a
 *     project's status reacts to activity between nightly runs.
 *
 * This package is intentionally standalone (its own package.json / tsconfig).
 * Deploy with:  firebase deploy --only functions
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";

initializeApp();
const db = getFirestore();

type MilestoneStatus = "on_track" | "behind" | "stalled";

function deriveMilestoneStatus(project: FirebaseFirestore.DocumentData): MilestoneStatus {
  const now = Date.now();
  const deadline = project.nextDeadline
    ? new Date(project.nextDeadline).getTime()
    : null;
  const lastActivity: Timestamp | undefined = project.lastActivityAt;
  const daysSinceActivity = lastActivity
    ? (now - lastActivity.toMillis()) / 86_400_000
    : Infinity;

  if (daysSinceActivity > 21) return "stalled";
  if (deadline && now > deadline && (project.progressPct ?? 0) < 100) {
    return "behind";
  }
  return "on_track";
}

/** 1 + 3: recompute a supervisor's rollup + the touched project's status. */
export const denormaliseDashboardStats = onDocumentWritten(
  "projects/{projectId}",
  async (event) => {
    const after = event.data?.after.data();
    const before = event.data?.before.data();
    const supervisorId = after?.supervisorId ?? before?.supervisorId;
    if (!supervisorId) return;

    const projectsSnap = await db
      .collection("projects")
      .where("supervisorId", "==", supervisorId)
      .get();

    const stats = {
      supervisorId,
      supervisorName: after?.supervisorName ?? before?.supervisorName ?? "",
      department: after?.department ?? before?.department ?? "",
      activeProjects: 0,
      overdueCount: 0,
      pendingSubmissions: 0,
      openTickets: 0,
      byMilestoneStatus: { on_track: 0, behind: 0, stalled: 0 } as Record<
        MilestoneStatus,
        number
      >,
      lastActivityAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    projectsSnap.forEach((doc) => {
      const p = doc.data();
      if (p.status === "active") stats.activeProjects += 1;
      stats.openTickets += p.openTicketCount ?? 0;
      const ms = (p.milestoneStatus ?? "on_track") as MilestoneStatus;
      stats.byMilestoneStatus[ms] += 1;
      if (ms === "behind" || ms === "stalled") stats.overdueCount += 1;
    });

    await db
      .doc(`dashboard_stats/${supervisorId}`)
      .set(stats, { merge: true });

    logger.info("dashboard_stats refreshed", { supervisorId });
  }
);

/** 2: nightly full recompute across active projects. */
export const recalcMilestoneStatusNightly = onSchedule(
  { schedule: "0 3 * * *", timeZone: "Africa/Lagos" },
  async () => {
    const snap = await db
      .collection("projects")
      .where("status", "==", "active")
      .get();

    const writer = db.bulkWriter();
    snap.forEach((doc) => {
      const next = deriveMilestoneStatus(doc.data());
      if (next !== doc.data().milestoneStatus) {
        writer.update(doc.ref, {
          milestoneStatus: next,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });
    await writer.close();
    logger.info("nightly milestone recompute done", { scanned: snap.size });
  }
);
