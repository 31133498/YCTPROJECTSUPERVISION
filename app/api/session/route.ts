import { NextResponse, type NextRequest } from "next/server";

import { getAdminAuth } from "@/lib/firebase-admin";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * POST { idToken } -> mints an HttpOnly session cookie after verifying the
 * Firebase ID token server-side. The client never sets an auth cookie itself.
 */
export async function POST(req: NextRequest) {
  let idToken: string | undefined;
  try {
    ({ idToken } = (await req.json()) as { idToken?: string });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken, true);
    // Require provisioned custom claims before a session is granted.
    if (!decoded.role || !decoded.department) {
      return NextResponse.json(
        { error: "Account is not provisioned with a role yet." },
        { status: 403 }
      );
    }

    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    const res = NextResponse.json({ status: "ok" });
    res.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid ID token" }, { status: 401 });
  }
}

/** DELETE -> clears the session cookie (sign-out). */
export async function DELETE() {
  const res = NextResponse.json({ status: "ok" });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
