import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/auth/session";
import { canReadProject } from "@/lib/server/project-access";
import { loadProjectAdmin } from "@/lib/server/project-writes";

export const runtime = "nodejs";

/**
 * POST { body } — anyone with read access to the project.
 * Batched with submission.commentCount, project.lastActivityAt, and — when the
 * supervisor comments first — submission.firstResponseAt (responsiveness metric).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; submissionId: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(await canReadProject(user, params.projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.body?.trim()) {
    return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
  }

  const db = getAdminDb();
  const project = await loadProjectAdmin(params.projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const subRef = db.doc(
    `projects/${params.projectId}/submissions/${params.submissionId}`
  );
  const subSnap = await subRef.get();
  if (!subSnap.exists) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const commentRef = subRef.collection("comments").doc();
  const batch = db.batch();

  batch.set(commentRef, {
    projectId: params.projectId,
    submissionId: params.submissionId,
    authorId: user.uid,
    authorName: user.name ?? "",
    authorRole: user.role,
    body: body.body.trim(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const patch: Record<string, unknown> = {
    commentCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const isSupervisorFirstReply =
    user.uid === project.supervisorId && !subSnap.data()?.firstResponseAt;
  if (isSupervisorFirstReply) {
    patch.firstResponseAt = FieldValue.serverTimestamp();
  }
  batch.set(subRef, patch, { merge: true });

  batch.set(
    db.doc(`projects/${params.projectId}`),
    { lastActivityAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  batch.set(
    db.doc(`dashboard_stats/${project.supervisorId}`),
    { lastActivityAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  await batch.commit();
  return NextResponse.json({ status: "ok", commentId: commentRef.id });
}
