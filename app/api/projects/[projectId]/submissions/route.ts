import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/auth/session";
import { bumpStats } from "@/lib/server/stats";
import { applyMilestone, loadProjectAdmin } from "@/lib/server/project-writes";
import type { SubmissionKind } from "@/lib/types";

export const runtime = "nodejs";

const KINDS: SubmissionKind[] = [
  "proposal",
  "chapter",
  "revision",
  "final",
  "other",
];

/**
 * POST { title, kind, storagePath, fileName, fileSize }
 * The file is already in Supabase (uploaded via /api/submissions/sign-upload).
 * Student of the project only.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const project = await loadProjectAdmin(params.projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (project.studentId !== user.uid) {
    return NextResponse.json({ error: "Only the project's student can submit" }, { status: 403 });
  }

  let body: {
    title?: string;
    kind?: string;
    storagePath?: string;
    fileName?: string;
    fileSize?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { title, kind, storagePath, fileName, fileSize } = body;
  if (!title?.trim() || !storagePath || !fileName || !fileSize) {
    return NextResponse.json(
      { error: "title, storagePath, fileName and fileSize are required" },
      { status: 400 }
    );
  }
  if (!storagePath.startsWith(`projects/${params.projectId}/submissions/`)) {
    return NextResponse.json({ error: "storagePath is out of scope" }, { status: 400 });
  }
  const subKind = KINDS.includes(kind as SubmissionKind)
    ? (kind as SubmissionKind)
    : "other";

  const db = getAdminDb();
  const projectRef = db.doc(`projects/${params.projectId}`);
  const subsCol = projectRef.collection("submissions");
  const version = (await subsCol.count().get()).data().count + 1;

  const subRef = subsCol.doc();
  const batch = db.batch();

  batch.set(subRef, {
    projectId: params.projectId,
    title: title.trim(),
    kind: subKind,
    status: "pending_review",
    version,
    storagePath,
    fileName,
    fileSize,
    submittedById: user.uid,
    submittedByName: user.name ?? "",
    commentCount: 0,
    firstResponseAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(
    projectRef,
    {
      lastSubmissionAt: FieldValue.serverTimestamp(),
      lastActivityAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const before = project.milestoneStatus;
  const verdict = applyMilestone(batch, projectRef, {
    ...project,
    lastSubmissionAt: FieldValue.serverTimestamp() as never,
    lastActivityAt: FieldValue.serverTimestamp() as never,
  });

  bumpStats(batch, db, project.supervisorId, { pendingSubmissions: 1 });
  if (before !== verdict.status) {
    const delta = (verdict.status !== "on_track" ? 1 : 0) - (before !== "on_track" ? 1 : 0);
    bumpStats(batch, db, project.supervisorId, { overdueCount: delta }, false);
    batch.set(
      db.doc(`dashboard_stats/${project.supervisorId}`),
      {
        [`byMilestoneStatus.${before}`]: FieldValue.increment(-1),
        [`byMilestoneStatus.${verdict.status}`]: FieldValue.increment(1),
      },
      { merge: true }
    );
  }

  await batch.commit();
  return NextResponse.json({ status: "ok", submissionId: subRef.id, version });
}
