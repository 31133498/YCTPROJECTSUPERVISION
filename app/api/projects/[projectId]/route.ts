import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/auth/session";
import { canReadProject } from "@/lib/server/project-access";
import { applyMilestone, loadProjectAdmin } from "@/lib/server/project-writes";
import { computeMilestoneStatus } from "@/lib/milestone";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";

/** GET -> on-the-fly milestone verdict for one project (read access required). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(await canReadProject(user, params.projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const p = await loadProjectAdmin(params.projectId);
  if (!p) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const verdict = computeMilestoneStatus({
    defenseDate: p.defenseDate ?? null,
    lastSubmissionDate:
      p.lastSubmissionAt instanceof Timestamp ? p.lastSubmissionAt.toDate() : null,
    lastActivityDate:
      p.lastActivityAt instanceof Timestamp ? p.lastActivityAt.toDate() : null,
    ticketsLast30Days: p.ticketsLast30Days ?? 0,
    finalApproved: Boolean(p.finalApproved),
  });
  return NextResponse.json(verdict);
}

/**
 * PATCH { defenseDate?, nextDeadline?, progressPct?, abstract?, status? }
 *  - supervisor of the project: defenseDate, nextDeadline, status
 *  - student of the project: abstract, progressPct
 * Recomputes milestone + folds any status change into dashboard_stats.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const project = await loadProjectAdmin(params.projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const isSupervisor = project.supervisorId === user.uid;
  const isStudent = project.studentId === user.uid;
  if (!isSupervisor && !isStudent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (isSupervisor) {
    if ("defenseDate" in body) patch.defenseDate = (body.defenseDate as string) || null;
    if ("nextDeadline" in body) patch.nextDeadline = (body.nextDeadline as string) || null;
    if (typeof body.status === "string") patch.status = body.status;
  }
  if (isStudent) {
    if (typeof body.abstract === "string" && body.abstract.trim()) {
      patch.abstract = body.abstract.trim();
    }
    if (typeof body.progressPct === "number") {
      patch.progressPct = Math.max(0, Math.min(100, Math.round(body.progressPct)));
    }
  }
  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const db = getAdminDb();
  const projectRef = db.doc(`projects/${params.projectId}`);
  const batch = db.batch();
  batch.set(projectRef, patch, { merge: true });

  const before = project.milestoneStatus;
  const verdict = applyMilestone(batch, projectRef, {
    ...project,
    defenseDate: (patch.defenseDate as string | null) ?? project.defenseDate,
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
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
  return NextResponse.json({ status: "ok", milestone: verdict });
}
