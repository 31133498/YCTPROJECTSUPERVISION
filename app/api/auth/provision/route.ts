import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { DEPARTMENTS } from "@/lib/constants";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

const ROLES: Role[] = ["student", "supervisor", "hod"];

/**
 * POST { idToken, role, department, displayName }
 *
 * One-time provisioning right after the client creates the Firebase account:
 *  - verify the ID token
 *  - refuse if the account is already provisioned (has a role claim or a
 *    users/{uid} doc) — prevents privilege re-assignment
 *  - set custom claims { role, department }
 *  - write users/{uid}
 *  - seed dashboard_stats/{uid} for supervisors
 *
 * The client then force-refreshes its token and calls /api/session.
 */
export async function POST(req: NextRequest) {
  let body: {
    idToken?: string;
    role?: string;
    department?: string;
    displayName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { idToken, role, department, displayName } = body;
  if (!idToken || !role || !department || !displayName) {
    return NextResponse.json(
      { error: "idToken, role, department and displayName are required" },
      { status: 400 }
    );
  }
  if (!ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "Unknown role" }, { status: 400 });
  }
  if (!DEPARTMENTS.includes(department as (typeof DEPARTMENTS)[number])) {
    return NextResponse.json({ error: "Unknown department" }, { status: 400 });
  }
  if (displayName.trim().length < 2) {
    return NextResponse.json({ error: "Name is too short" }, { status: 400 });
  }

  const auth = getAdminAuth();
  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await auth.verifyIdToken(idToken, true);
    uid = decoded.uid;
    email = decoded.email;
    if (decoded.role) {
      return NextResponse.json(
        { error: "Account is already provisioned" },
        { status: 409 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid ID token" }, { status: 401 });
  }

  const db = getAdminDb();
  const userRef = db.doc(`users/${uid}`);
  if ((await userRef.get()).exists) {
    return NextResponse.json(
      { error: "Account is already provisioned" },
      { status: 409 }
    );
  }

  await auth.setCustomUserClaims(uid, { role, department });

  const batch = db.batch();
  batch.set(userRef, {
    uid,
    displayName: displayName.trim(),
    email: (email ?? "").toLowerCase(),
    role,
    department,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (role === "supervisor") {
    batch.set(db.doc(`dashboard_stats/${uid}`), {
      supervisorId: uid,
      supervisorName: displayName.trim(),
      department,
      activeProjects: 0,
      overdueCount: 0,
      pendingSubmissions: 0,
      openTickets: 0,
      avgResponseHours: null,
      byMilestoneStatus: { on_track: 0, behind: 0, stalled: 0 },
      lastActivityAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  return NextResponse.json({ status: "ok", uid, role });
}
