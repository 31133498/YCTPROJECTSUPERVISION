import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/auth/session";
import { bumpStats } from "@/lib/server/stats";
import { queueNotification } from "@/lib/server/notify";

export const runtime = "nodejs";

/**
 * POST { studentId, title, abstract, defenseDate? }
 * Supervisor creates a project for one of their department's students.
 * Batched with users/{studentId} link + dashboard_stats.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (user.role !== "supervisor") {
    return NextResponse.json({ error: "Only supervisors can create projects" }, { status: 403 });
  }

  let body: {
    studentId?: string;
    title?: string;
    abstract?: string;
    defenseDate?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { studentId, title, abstract, defenseDate = null } = body;
  if (!studentId || !title?.trim() || !abstract?.trim()) {
    return NextResponse.json(
      { error: "studentId, title and abstract are required" },
      { status: 400 }
    );
  }

  const db = getAdminDb();
  const studentSnap = await db.doc(`users/${studentId}`).get();
  const student = studentSnap.data();
  if (!studentSnap.exists || student?.role !== "student") {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  if (student.department !== user.department) {
    return NextResponse.json(
      { error: "Student is in another department" },
      { status: 403 }
    );
  }
  if (student.projectId) {
    return NextResponse.json(
      { error: "That student already has a project" },
      { status: 409 }
    );
  }

  const projectRef = db.collection("projects").doc();
  const batch = db.batch();

  batch.set(projectRef, {
    title: title.trim(),
    abstract: abstract.trim(),
    department: user.department,
    status: "active",
    milestoneStatus: "on_track",
    milestoneReason: "On schedule",
    studentId,
    studentName: student.displayName,
    supervisorId: user.uid,
    supervisorName: user.name ?? "",
    nextDeadline: null,
    defenseDate: defenseDate || null,
    progressPct: 0,
    openTicketCount: 0,
    ticketsLast30Days: 0,
    lastSubmissionAt: null,
    finalApproved: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastActivityAt: FieldValue.serverTimestamp(),
  });

  batch.set(
    studentSnap.ref,
    {
      supervisorId: user.uid,
      projectId: projectRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  bumpStats(batch, db, user.uid, { activeProjects: 1 });
  batch.set(
    db.doc(`dashboard_stats/${user.uid}`),
    { "byMilestoneStatus.on_track": FieldValue.increment(1) },
    { merge: true }
  );

  queueNotification(batch, db, studentId, {
    kind: "project",
    title: `${user.name ?? "Your supervisor"} created your project "${title.trim()}"`,
    href: `/student/project/${projectRef.id}`,
    actorName: user.name ?? "",
  });

  await batch.commit();
  return NextResponse.json({ status: "ok", projectId: projectRef.id });
}
