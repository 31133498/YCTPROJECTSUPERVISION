import { NextResponse, type NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { canReadProject } from "@/lib/server/project-access";
import { createSubmissionSignedUrl } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * POST { projectId, storagePath } -> { url }  (short-lived Supabase download URL)
 *
 * Guard: caller must be able to read the project (student / assigned
 * supervisor / department HOD), and `storagePath` must sit under that project.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { projectId?: string; storagePath?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { projectId, storagePath } = body;
  if (!projectId || !storagePath) {
    return NextResponse.json(
      { error: "projectId and storagePath are required" },
      { status: 400 }
    );
  }
  if (!storagePath.startsWith(`projects/${projectId}/submissions/`)) {
    return NextResponse.json(
      { error: "storagePath does not belong to this project" },
      { status: 400 }
    );
  }

  if (!(await canReadProject(user, projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = await createSubmissionSignedUrl(storagePath);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
