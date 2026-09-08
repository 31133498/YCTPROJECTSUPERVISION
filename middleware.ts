import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge gate: presence check only. The Admin SDK can't run on the edge, so this
 * does NOT verify the cookie or read claims — it just keeps unauthenticated
 * traffic off protected routes and signed-in users off /login. Full
 * verification + role enforcement happens in each route group's server layout
 * via `requireRole()`, and again in Firestore/Storage rules.
 */
const SESSION_COOKIE = "__session";
const PUBLIC_PATHS = ["/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, the session route, and static assets.
  matcher: ["/((?!api/session|_next/static|_next/image|favicon.ico).*)"],
};
