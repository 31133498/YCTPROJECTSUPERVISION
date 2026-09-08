import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/auth/session";
import { applyMilestone, loadProjectAdmin } from "@/lib/server/project-writes";
import type { SubmissionStatus } from "@/lib/types";

export const runtime = "nodejs";

const STATUSES: SubmissionStatus[] = [
  "pending_review",
  "changes_requested",
  "approved",
];

/** PATCH { status } — the project's supervisor sets the review outcome. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; submissionId: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const project = await loadProjectAdmin(params.projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (project.supervisorId !== user.uid) {
    return NextResponse.json({ error: "Only the supervisor can review" }, { status: 403 });
  }

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!STATUSES.includes(body.status as SubmissionStatus)) {
    return NextResponse.json({ error: "Unknown status" }, { status: 400 });
  }
  const next = body.status as SubmissionStatus;

  const db = getAdminDb();
  const subRef = db.doc(
    `projects/${params.projectId}/submissions/${params.submissionId}`
  );
  const snap = await subRef.get();
  if (!snap.exists) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  const sub = snap.data()!;
  const projectRef = db.doc(`projects/${params.projectId}`);
  const batch = db.batch();

  batch.set(
    subRef,
    { status: next, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  // pendingSubmissions delta
  const wasPending = sub.status === "pending_review";
  const isPending = next === "pending_review";
  if (wasPending !== isPending) {
    batch.set(
      db.doc(`dashboard_stats/${project.supervisorId}`),
      {
        pendingSubmissions: FieldValue.increment(isPending ? 1 : -1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  const finalApproved =
    next === "approved" && sub.kind === "final" ? true : project.finalApproved;

  batch.set(
    projectRef,
    {
      finalApproved,
      lastActivityAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      ...(next === "approved" && sub.kind === "final"
        ? { status: "approved", progressPct: 100 }
        : {}),
    },
    { merge: true }
  );

  const before = project.milestoneStatus;
  const verdict = applyMilestone(batch, projectRef, {
    ...project,
    finalApproved,
    lastActivityAt: FieldValue.serverTimestamp() as never,
  });
  if (before !== verdict.status) {
    const delta =
      (verdict.status !== "on_track" ? 1 : 0) - (before !== "on_track" ? 1 : 0);
    batch.set(
      db.doc(`dashboard_stats/${project.supervisorId}`),
      {
        overdueCount: FieldValue.increment(delta),
        [`byMilestoneStatus.${before}`]: FieldValue.increment(-1),
        [`byMilestoneStatus.${verdict.status}`]: FieldValue.increment(1),
      },
      { merge: true }
    );
  }

  await batch.commit();
  return NextResponse.json({ status: "ok", milestone: verdict });
}
